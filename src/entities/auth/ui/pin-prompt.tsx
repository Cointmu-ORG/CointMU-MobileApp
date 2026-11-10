import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { logger } from '@/shared/lib';
import { PinEntry, usePinInput } from '@/shared/ui';

import { PIN_LENGTH } from '../config/auth-config';
import { formatCountdown } from '../lib/format-countdown';
import { remainingLockoutMs, type LockoutState } from '../lib/lockout';
import { useAuthPrefsStore } from '../model/auth-prefs-store';
import { useLockoutCountdown } from '../model/use-lockout-countdown';
import { attemptBiometrics, attemptPin, loadLockout } from '../model/verify-pin';

export type PinPromptBiometrics = {
  /** Shown by the system biometric sheet. */
  prompt: string;
  /** Open the biometric sheet once on mount, when no lockout runs (lock screen). */
  shouldPromptOnMount?: boolean;
};

type PinPromptProps = {
  title: string;
  subtitle?: string;
  /** Shown above the title (the lock screen's logo). */
  logo?: ReactNode;
  onVerified: () => void;
  /** Offer biometrics as well. Omit for PIN-only checks (change PIN, remove wallet). */
  biometrics?: PinPromptBiometrics;
  /** Extra content under the status line, e.g. the reset offer on the lock screen. */
  renderFooter?: (lockout: LockoutState | null) => ReactNode;
};

/** Loads the lockout once, and offers biometrics on mount when the caller asks for it. */
function useLockoutAndBiometrics(
  biometrics: PinPromptBiometrics | undefined,
  tryBiometrics: () => Promise<void>,
) {
  const isBiometricsEnabled = useAuthPrefsStore((state) => state.isBiometricsEnabled);
  const [lockout, setLockout] = useState<LockoutState | null>(null);
  const hasPrompted = useRef(false);
  const canUseBiometrics = biometrics !== undefined && isBiometricsEnabled;

  useEffect(() => {
    loadLockout()
      .then(setLockout)
      .catch((error: unknown) => logger.error('Loading lockout state failed', { error }));
  }, []);

  useEffect(() => {
    if (!lockout || !canUseBiometrics || !biometrics?.shouldPromptOnMount) return;
    if (hasPrompted.current || remainingLockoutMs(lockout, Date.now()) > 0) return;
    hasPrompted.current = true;
    void tryBiometrics();
  }, [lockout, canUseBiometrics, biometrics, tryBiometrics]);

  return { lockout, setLockout, canUseBiometrics };
}

/**
 * PIN entry with the shared lockout (D-16, D-27). Used by the lock screen and before every
 * sensitive action. The PIN only lives in the pad's buffer and is cleared after each attempt.
 */
export function PinPrompt({
  title,
  subtitle,
  logo,
  onVerified,
  biometrics,
  renderFooter,
}: PinPromptProps) {
  const { t } = useTranslation();
  const [message, setMessage] = useState<string | null>(null);
  const [errorSignal, setErrorSignal] = useState(0);
  const [isBusy, setIsBusy] = useState(false);

  const tryBiometrics = useCallback(async () => {
    if (!biometrics) return;
    try {
      if (await attemptBiometrics(biometrics.prompt)) onVerified();
    } catch (error) {
      logger.warn('Biometric check failed', { error });
    }
  }, [biometrics, onVerified]);
  const { lockout, setLockout, canUseBiometrics } = useLockoutAndBiometrics(
    biometrics,
    tryBiometrics,
  );
  const remainingMs = useLockoutCountdown(lockout);

  const handleComplete = useCallback(
    async (pin: string) => {
      setIsBusy(true);
      setMessage(null);
      try {
        const result = await attemptPin(pin);
        if (result.status === 'verified') return onVerified();
        setLockout(result.lockout);
        setMessage(t('lock.wrongPin'));
      } catch (error) {
        logger.error('PIN check failed', { error });
        setMessage(t('pinPrompt.error'));
      } finally {
        setIsBusy(false);
      }
      setErrorSignal((signal) => signal + 1);
    },
    [onVerified, setLockout, t],
  );

  const { filledCount, addDigit, removeDigit, clear } = usePinInput(PIN_LENGTH, (pin) => {
    void handleComplete(pin);
  });
  useEffect(clear, [errorSignal, clear]);

  const isLocked = remainingMs > 0;
  const statusText = isLocked
    ? t('lock.lockedOut', { time: formatCountdown(remainingMs) })
    : message;
  return (
    <PinEntry
      title={title}
      subtitle={subtitle}
      logo={logo}
      length={PIN_LENGTH}
      filledCount={filledCount}
      errorSignal={errorSignal}
      error={statusText}
      busyLabel={isBusy ? t('pinPrompt.checking') : null}
      footer={renderFooter?.(lockout)}
      onDigit={addDigit}
      onDelete={removeDigit}
      onBiometrics={canUseBiometrics && !isLocked ? () => void tryBiometrics() : undefined}
      isDisabled={isLocked}
    />
  );
}
