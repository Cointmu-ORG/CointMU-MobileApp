import { usePreventScreenCapture } from 'expo-screen-capture';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppState, ScrollView, View } from 'react-native';

import { PinPrompt } from '@/entities/auth';
import { useWalletStore } from '@/entities/wallet';
import { logger } from '@/shared/lib';
import { Button, Text, WordGrid } from '@/shared/ui';

import { loadRecoveryWords } from '../model/load-words';
import { PhraseWarning } from './phrase-warning';

type State = { step: 'intro' | 'auth' | 'error' } | { step: 'shown'; words: string[] };

function Intro({ onReveal, isFailed }: { onReveal: () => void; isFailed: boolean }) {
  const { t } = useTranslation();
  return (
    <ScrollView contentContainerClassName="gap-6 pb-8">
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

/**
 * Settings > Recovery phrase. Screenshots are blocked for the whole screen. The words are read
 * from SecureStore only after a PIN or biometric check, kept in component state, and dropped on
 * "Hide", on leaving the screen, and as soon as Muvo leaves the foreground.
 */
export function RevealPhrase() {
  usePreventScreenCapture();
  const { t } = useTranslation();
  const source = useWalletStore((state) => state.source);
  const [state, setState] = useState<State>({ step: 'intro' });

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next !== 'active') setState({ step: 'intro' });
    });
    return () => subscription.remove();
  }, []);

  const reveal = useCallback(async () => {
    try {
      setState({ step: 'shown', words: await loadRecoveryWords() });
    } catch (error) {
      logger.error('Revealing the recovery phrase failed', { error });
      setState({ step: 'error' });
    }
  }, []);

  if (source === 'private-key') {
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
      <ScrollView contentContainerClassName="gap-6 pb-8">
        <PhraseWarning />
        <WordGrid words={state.words} />
        <View className="gap-2">
          <Button
            label={t('settings.recoveryPhrase.hide')}
            onPress={() => setState({ step: 'intro' })}
          />
          <Text variant="caption" tone="secondary" className="text-center">
            {t('settings.recoveryPhrase.autoHide')}
          </Text>
        </View>
      </ScrollView>
    );
  }
  return <Intro onReveal={() => setState({ step: 'auth' })} isFailed={state.step === 'error'} />;
}
