import { usePreventScreenCapture } from 'expo-screen-capture';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppState, ScrollView, View } from 'react-native';

import { PinPrompt } from '@/entities/auth';
import { useAccountLabel, useActiveAccount, useWalletStore } from '@/entities/wallet';
import { logger } from '@/shared/lib';
import { Button, Card, Notice, Text } from '@/shared/ui';

import { loadActivePrivateKey } from '../model/load-private-key';

type State = { step: 'intro' | 'auth' | 'error' } | { step: 'shown'; privateKey: string };

/** Why this key matters for this kind of wallet. */
function useScopeText(): string {
  const { t } = useTranslation();
  const source = useWalletStore((state) => state.source);
  const account = useActiveAccount();
  const label = useAccountLabel();
  return source === 'private-key'
    ? t('settings.privateKey.scopeImported')
    : t('settings.privateKey.scopePhrase', { account: account ? label(account) : '' });
}

function Intro({ onReveal, isFailed }: { onReveal: () => void; isFailed: boolean }) {
  const { t } = useTranslation();
  const scope = useScopeText();
  return (
    <ScrollView contentContainerClassName="gap-6 pb-8">
      <Text tone="secondary">{scope}</Text>
      <Notice tone="danger" title={t('settings.privateKey.warningTitle')}>
        {t('settings.privateKey.warning')}
      </Notice>
      {isFailed ? (
        <Text tone="danger" accessibilityLiveRegion="polite">
          {t('settings.privateKey.failed')}
        </Text>
      ) : null}
      <Button label={t('settings.privateKey.reveal')} onPress={onReveal} />
    </ScrollView>
  );
}

/**
 * Settings > Security > Show private key (D-70). Same gates as the recovery phrase: screenshots
 * are blocked for the whole screen, the key is read only after a PIN or biometric check, kept in
 * component state, and dropped on "Hide", on leaving the screen and as soon as Muvo leaves the
 * foreground. There is no copy action and the text cannot be selected.
 */
export function RevealPrivateKey() {
  usePreventScreenCapture();
  const { t } = useTranslation();
  const account = useActiveAccount();
  const label = useAccountLabel();
  const [state, setState] = useState<State>({ step: 'intro' });

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next !== 'active') setState({ step: 'intro' });
    });
    return () => subscription.remove();
  }, []);

  const reveal = useCallback(async () => {
    try {
      setState({ step: 'shown', privateKey: await loadActivePrivateKey() });
    } catch (error) {
      logger.error('Revealing the private key failed', { error });
      setState({ step: 'error' });
    }
  }, []);

  if (state.step === 'auth') {
    return (
      <PinPrompt
        title={t('settings.privateKey.authTitle')}
        subtitle={t('settings.privateKey.authSubtitle')}
        biometrics={{ prompt: t('settings.privateKey.authPrompt') }}
        onVerified={() => void reveal()}
      />
    );
  }

  if (state.step === 'shown') {
    return (
      <ScrollView contentContainerClassName="gap-6 pb-8">
        <Notice tone="danger" title={t('settings.privateKey.warningTitle')}>
          {t('settings.privateKey.warning')}
        </Notice>
        <Card className="gap-3">
          {account ? (
            <View className="gap-0.5">
              <Text variant="label">{label(account)}</Text>
              <Text variant="mono" tone="secondary">
                {account.address}
              </Text>
            </View>
          ) : null}
          <View className="gap-1">
            <Text variant="caption" tone="secondary">
              {t('settings.privateKey.keyLabel')}
            </Text>
            <Text variant="mono" selectable={false}>
              {state.privateKey}
            </Text>
          </View>
        </Card>
        <View className="gap-2">
          <Button
            label={t('settings.privateKey.hide')}
            onPress={() => setState({ step: 'intro' })}
          />
          <Text variant="caption" tone="secondary" className="text-center">
            {t('settings.privateKey.autoHide')}
          </Text>
        </View>
      </ScrollView>
    );
  }

  return <Intro onReveal={() => setState({ step: 'auth' })} isFailed={state.step === 'error'} />;
}
