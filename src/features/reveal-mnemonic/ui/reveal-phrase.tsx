import { usePreventScreenCapture } from 'expo-screen-capture';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppState, ScrollView, View } from 'react-native';

import { PinPrompt } from '@/entities/auth';
import { useActiveWallet, useWalletLabel } from '@/entities/wallet';
import { logger } from '@/shared/lib';
import { Button, SecretEye, Text, useTimedReveal, WordGrid } from '@/shared/ui';

import { loadRecoveryWords } from '../model/load-words';
import { PhraseWarning } from './phrase-warning';

type State = { step: 'intro' | 'auth' | 'error' } | { step: 'shown'; words: string[] };

type IntroProps = { walletName: string; onReveal: () => void; isFailed: boolean };

function Intro({ walletName, onReveal, isFailed }: IntroProps) {
  const { t } = useTranslation();
  return (
    <ScrollView contentContainerClassName="gap-6 pb-8">
      <Text variant="heading" accessibilityRole="header">
        {t('settings.recoveryPhrase.wallet', { wallet: walletName })}
      </Text>
      <Text tone="secondary">{t('settings.recoveryPhrase.description')}</Text>
      <PhraseWarning />
      {isFailed ? (
        <Text tone="danger" accessibilityLiveRegion="polite">
          {t('settings.recoveryPhrase.failed')}
        </Text>
      ) : null}
      <Button label={t('settings.recoveryPhrase.reveal')} onPress={onReveal} />
    </ScrollView>
  );
}

/** The words stay masked until the eye is pressed, and mask themselves again after 30 s. */
type ShownPhraseProps = { walletName: string; words: readonly string[]; onHide: () => void };

function ShownPhrase({ walletName, words, onHide }: ShownPhraseProps) {
  const { t } = useTranslation();
  const { isRevealed, toggle } = useTimedReveal();
  return (
    <ScrollView contentContainerClassName="gap-6 pb-8">
      <Text variant="heading" accessibilityRole="header">
        {t('settings.recoveryPhrase.wallet', { wallet: walletName })}
      </Text>
      <PhraseWarning />
      <View className="gap-1">
        <View className="flex-row items-center justify-between">
          <Text variant="caption" tone="secondary">
            {t(isRevealed ? 'settings.recoveryPhrase.revealed' : 'settings.recoveryPhrase.masked')}
          </Text>
          <SecretEye
            isRevealed={isRevealed}
            onToggle={toggle}
            showLabel={t('settings.recoveryPhrase.showWords')}
            hideLabel={t('settings.recoveryPhrase.hideWords')}
          />
        </View>
        <WordGrid words={words} isMasked={!isRevealed} />
      </View>
      <View className="gap-2">
        <Button label={t('settings.recoveryPhrase.hide')} onPress={onHide} />
        <Text variant="caption" tone="secondary" className="text-center">
          {t('settings.recoveryPhrase.autoHide')}
        </Text>
      </View>
    </ScrollView>
  );
}

/**
 * Settings > Recovery phrase, for the active wallet, whose name is shown (D-78). Screenshots are
 * blocked for the whole screen. The words are read from that wallet's SecureStore item only
 * after a PIN or biometric check, kept in component state, shown masked
 * until the eye is pressed, and dropped on "Hide", on leaving the screen, and as soon as Muvo
 * leaves the foreground.
 */
export function RevealPhrase() {
  usePreventScreenCapture();
  const { t } = useTranslation();
  const wallet = useActiveWallet();
  const walletLabel = useWalletLabel();
  const walletId = wallet?.id;
  const [state, setState] = useState<State>({ step: 'intro' });

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next !== 'active') setState({ step: 'intro' });
    });
    return () => subscription.remove();
  }, []);

  const reveal = useCallback(async () => {
    if (walletId === undefined) return;
    try {
      setState({ step: 'shown', words: await loadRecoveryWords(walletId) });
    } catch (error) {
      logger.error('Revealing the recovery phrase failed', { error });
      setState({ step: 'error' });
    }
  }, [walletId]);

  if (wallet === null) return null;
  const walletName = walletLabel(wallet);
  if (wallet.source === 'private-key') {
    return <Text tone="secondary">{t('settings.recoveryPhrase.privateKey')}</Text>;
  }
  if (state.step === 'auth') {
    return (
      <PinPrompt
        title={t('settings.recoveryPhrase.authTitle')}
        subtitle={t('settings.recoveryPhrase.authSubtitle')}
        biometrics={{ prompt: t('settings.recoveryPhrase.authTitle') }}
        onVerified={() => void reveal()}
      />
    );
  }
  if (state.step === 'shown') {
    return (
      <ShownPhrase
        walletName={walletName}
        words={state.words}
        onHide={() => setState({ step: 'intro' })}
      />
    );
  }
  return (
    <Intro
      walletName={walletName}
      onReveal={() => setState({ step: 'auth' })}
      isFailed={state.step === 'error'}
    />
  );
}
