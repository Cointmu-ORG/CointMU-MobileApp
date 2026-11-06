import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import {
  PIN_LENGTH,
  remainingLockoutMs,
  shouldOfferReset,
  useAuthPrefsStore,
  type LockoutState,
} from '@/entities/auth';
import { logger } from '@/shared/lib';
import { PinDots, PinPad, Text, usePinInput } from '@/shared/ui';

import {
  attemptBiometricUnlock,
  attemptPinUnlock,
  completeUnlock,
  loadLockout,
} from '../model/unlock';
import { useLockoutCountdown } from '../model/use-lockout-countdown';
import { LockoutNotice } from './lockout-notice';
import { useUnlockSuccess } from './use-unlock-success';

type UnlockFormProps = {
  /** Shown after too many failures (D-16); the page owns the reset confirmation. */
  onResetRequested: () => void;
};

export function UnlockForm({ onResetRequested }: UnlockFormProps) {
  const { t } = useTranslation();
  const isBiometricsEnabled = useAuthPrefsStore((state) => state.isBiometricsEnabled);
  const [lockout, setLockout] = useState<LockoutState | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [errorSignal, setErrorSignal] = useState(0);
  const [isBusy, setIsBusy] = useState(false);
  const remainingMs = useLockoutCountdown(lockout);
  const { style: successStyle, play: playSuccess } = useUnlockSuccess();
  const hasPromptedBiometrics = useRef(false);

  const handleComplete = useCallback(
    async (pin: string) => {
      setIsBusy(true);
      try {
        const result = await attemptPinUnlock(pin);
        if (result.status === 'verified') return playSuccess(completeUnlock);
        setLockout(result.lockout);
        setMessage(t('lock.wrongPin'));
        setErrorSignal((signal) => signal + 1);
      } catch (error) {
        logger.error('PIN unlock failed', { error });
        setErrorSignal((signal) => signal + 1);
      } finally {
        setIsBusy(false);
      }
    },
    [playSuccess, t],
  );

  const { filledCount, addDigit, removeDigit, clear } = usePinInput(PIN_LENGTH, (pin) => {
    void handleComplete(pin);
  });
  useEffect(clear, [errorSignal, clear]);

  const tryBiometrics = useCallback(async () => {
    try {
      if (await attemptBiometricUnlock(t('lock.biometricsPrompt'))) playSuccess(completeUnlock);
    } catch (error) {
      logger.warn('Biometric unlock failed', { error });
    }
  }, [playSuccess, t]);

  useEffect(() => {
    loadLockout()
      .then(setLockout)
      .catch((error: unknown) => logger.error('Loading lockout state failed', { error }));
  }, []);

  // Prompt biometrics once, after the lockout is known and only if it is not running.
  useEffect(() => {
    if (!lockout || !isBiometricsEnabled || hasPromptedBiometrics.current) return;
    if (remainingLockoutMs(lockout, Date.now()) > 0) return;
    hasPromptedBiometrics.current = true;
    void tryBiometrics();
  }, [lockout, isBiometricsEnabled, tryBiometrics]);

  const isLocked = remainingMs > 0;
  return (
    <Animated.View style={[styles.fill, successStyle]}>
      <View className="flex-1 justify-between gap-8">
        <View className="gap-6 pt-8">
          <Text variant="title" className="text-center" accessibilityRole="header">
            {t('lock.title')}
          </Text>
          <PinDots length={PIN_LENGTH} filledCount={filledCount} errorSignal={errorSignal} />
          <LockoutNotice
            remainingMs={remainingMs}
            message={message}
            isResetOffered={lockout !== null && shouldOfferReset(lockout)}
            onResetRequested={onResetRequested}
          />
        </View>
        <PinPad
          onDigit={addDigit}
          onDelete={removeDigit}
          onBiometrics={isBiometricsEnabled && !isLocked ? () => void tryBiometrics() : undefined}
          isDisabled={isBusy || isLocked}
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
