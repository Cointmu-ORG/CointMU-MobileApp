import { usePreventScreenCapture } from 'expo-screen-capture';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppState, ScrollView, View } from 'react-native';

import { PinPrompt } from '@/entities/auth';
import {
  useAccount,
  useAccountLabel,
  useWalletLabel,
  useWalletStore,
  type ActiveAccount,
} from '@/entities/wallet';
import { logger, shortenAddress } from '@/shared/lib';
import { Button, Card, Notice, SecretEye, Text, useTimedReveal } from '@/shared/ui';

import { loadPrivateKey } from '../model/load-private-key';

/** Fixed, so the mask says nothing about the key (and is plainly not its real length). */
const MASKED_KEY = '•'.repeat(24);

type State = { step: 'intro' | 'auth' | 'error' } | { step: 'shown'; privateKey: string };

/** "Account 2 in Savings": which account of which wallet the key belongs to (D-78). */
function useOwnerText(account: ActiveAccount | null): string {
  const { t } = useTranslation();
  const wallet = useWalletStore(
    (state) => state.wallets.find((candidate) => candidate.id === account?.walletId) ?? null,
  );
  const accountLabel = useAccountLabel();
  const walletLabel = useWalletLabel();
  if (account === null || wallet === null) return '';
  return t('settings.privateKey.owner', {
    account: accountLabel(account),
    wallet: walletLabel(wallet),
  });
}

/** Why this key matters for this kind of wallet. */
function useScopeText(account: ActiveAccount): string {
  const { t } = useTranslation();
  const source = useWalletStore(
    (state) => state.wallets.find((candidate) => candidate.id === account.walletId)?.source,
  );
  const label = useAccountLabel();
  return source === 'private-key'
    ? t('settings.privateKey.scopeImported')
    : t('settings.privateKey.scopePhrase', { account: label(account) });
}

type IntroProps = { account: ActiveAccount; onReveal: () => void; isFailed: boolean };

function Intro({ account, onReveal, isFailed }: IntroProps) {
  const { t } = useTranslation();
  const scope = useScopeText(account);
  const owner = useOwnerText(account);
  return (
    <ScrollView contentContainerClassName="gap-6 pb-8">
      <View className="gap-1">
        <Text variant="heading" accessibilityRole="header">
          {owner}
        </Text>
        <Text variant="mono" tone="secondary">
          {shortenAddress(account.address)}
        </Text>
      </View>
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

/** The key stays masked until the eye is pressed, and masks itself again after 30 s. */
type ShownKeyProps = { account: ActiveAccount; privateKey: string; onHide: () => void };

function ShownKey({ account, privateKey, onHide }: ShownKeyProps) {
  const { t } = useTranslation();
  const owner = useOwnerText(account);
  const { isRevealed, toggle } = useTimedReveal();
  return (
    <ScrollView contentContainerClassName="gap-6 pb-8">
      <Notice tone="danger" title={t('settings.privateKey.warningTitle')}>
        {t('settings.privateKey.warning')}
      </Notice>
      <Card className="gap-3">
        <View className="gap-0.5">
          <Text variant="label">{owner}</Text>
          <Text variant="mono" tone="secondary">
            {account.address}
          </Text>
        </View>
        <View className="gap-1">
          <View className="flex-row items-center justify-between">
            <Text variant="caption" tone="secondary">
              {t('settings.privateKey.keyLabel')}
            </Text>
            <SecretEye
              isRevealed={isRevealed}
              onToggle={toggle}
              showLabel={t('settings.privateKey.showKey')}
              hideLabel={t('settings.privateKey.hideKey')}
            />
          </View>
          <Text variant="mono" selectable={false}>
            {isRevealed ? privateKey : MASKED_KEY}
          </Text>
        </View>
      </Card>
      <View className="gap-2">
        <Button label={t('settings.privateKey.hide')} onPress={onHide} />
        <Text variant="caption" tone="secondary" className="text-center">
          {t('settings.privateKey.autoHide')}
        </Text>
      </View>
    </ScrollView>
  );
}

/**
 * Settings > Security > Show private key (D-70), for the account the caller names: a wallet and,
 * when it has several accounts, one of them; its first account otherwise (D-94). Every step
 * names the account and its wallet and shows the address. Same gates as the recovery phrase:
 * screenshots are blocked for the whole screen, the key is read only after a PIN or biometric
 * check, kept in component state, shown masked until the eye is pressed, and dropped on "Hide",
 * on leaving the screen and as soon as Muvo leaves the foreground. There is no copy action and
 * the text cannot be selected.
 */
export function RevealPrivateKey({ walletId, index }: { walletId: string; index?: number }) {
  usePreventScreenCapture();
  const { t } = useTranslation();
  const firstIndex = useWalletStore(
    (state) => state.wallets.find((wallet) => wallet.id === walletId)?.accounts[0]?.index,
  );
  const account = useAccount({ walletId, index: index ?? firstIndex ?? 0 });
  const owner = useOwnerText(account);
  const [state, setState] = useState<State>({ step: 'intro' });

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next !== 'active') setState({ step: 'intro' });
    });
    return () => subscription.remove();
  }, []);

  const reveal = useCallback(async () => {
    if (account === null) return;
    try {
      setState({ step: 'shown', privateKey: await loadPrivateKey(account) });
    } catch (error) {
      logger.error('Revealing the private key failed', { error });
      setState({ step: 'error' });
    }
  }, [account]);

  if (account === null) return null;
  if (state.step === 'auth') {
    return (
      <PinPrompt
        title={t('settings.privateKey.authTitle')}
        subtitle={t('settings.privateKey.authSubtitle', {
          owner,
          address: shortenAddress(account.address),
        })}
        biometrics={{ prompt: t('settings.privateKey.authPrompt') }}
        onVerified={() => void reveal()}
      />
    );
  }

  if (state.step === 'shown') {
    return (
      <ShownKey
        account={account}
        privateKey={state.privateKey}
        onHide={() => setState({ step: 'intro' })}
      />
    );
  }

  return (
    <Intro
      account={account}
      onReveal={() => setState({ step: 'auth' })}
      isFailed={state.step === 'error'}
    />
  );
}
