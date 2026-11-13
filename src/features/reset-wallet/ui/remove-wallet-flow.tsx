import TriangleAlert from 'lucide-react-native/icons/triangle-alert';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, ScrollView, View } from 'react-native';

import { PinPrompt } from '@/entities/auth';
import { useWalletLabel, useWalletStore } from '@/entities/wallet';
import { logger, shortenAddress } from '@/shared/lib';
import { Button, Checkbox, ICON_SIZE, Text, useThemeColors } from '@/shared/ui';

import { removeWallet } from '../model/reset-wallet';

type WarningProps = {
  walletName: string;
  /** Short address of the wallet's first account, so two wallets cannot be mixed up. */
  address: string;
  /** Removing the last wallet also removes the PIN and returns to onboarding. */
  isLastWallet: boolean;
  onContinue: () => void;
};

function Warning({ walletName, address, isLastWallet, onContinue }: WarningProps) {
  const colors = useThemeColors();
  const { t } = useTranslation();
  const [hasBackup, setHasBackup] = useState(false);
  return (
    <ScrollView contentContainerClassName="gap-6 pb-8">
      <View className="gap-3 rounded-card border border-danger bg-danger-soft p-4">
        <View className="flex-row items-center gap-2">
          <TriangleAlert size={ICON_SIZE.md} color={colors.danger.strong} />
          <Text variant="label" tone="danger" className="flex-1">
            {t('settings.removeWallet.warningTitle')}
          </Text>
        </View>
        <Text variant="body">{t('settings.removeWallet.warning')}</Text>
      </View>
      <View className="gap-1">
        <Text variant="heading" accessibilityRole="header">
          {t('settings.removeWallet.target', { wallet: walletName })}
        </Text>
        <Text variant="mono" tone="secondary">
          {address}
        </Text>
      </View>
      <Text tone="secondary">
        {t(
          isLastWallet
            ? 'settings.removeWallet.descriptionLast'
            : 'settings.removeWallet.description',
        )}
      </Text>
      <Checkbox
        label={t('settings.removeWallet.ack')}
        isChecked={hasBackup}
        onToggle={() => setHasBackup((current) => !current)}
      />
      <Button
        label={t('settings.removeWallet.continue')}
        variant="danger"
        onPress={onContinue}
        isDisabled={!hasBackup}
      />
    </ScrollView>
  );
}

type RemoveWalletFlowProps = {
  /** The wallet to remove. The caller names it; nothing here falls back to another one (D-94). */
  walletId: string;
  onCancel: () => void;
  /** Called after one of several wallets was removed. Removing the last one needs none. */
  onRemoved?: () => void;
};

/**
 * "Remove wallet from this device", for one wallet (D-78): a warning with a backup
 * acknowledgement (first confirmation), the PIN, then a final confirmation. All three name the
 * wallet and show its first account's short address (D-94). The other wallets stay. Removing the last wallet is the full wipe of reset-wallet, and the router then
 * goes back to onboarding.
 */
export function RemoveWalletFlow({ walletId, onCancel, onRemoved }: RemoveWalletFlowProps) {
  const { t } = useTranslation();
  const walletLabel = useWalletLabel();
  const target = useWalletStore(
    (state) => state.wallets.find((candidate) => candidate.id === walletId) ?? null,
  );
  const isLastWallet = useWalletStore((state) => state.wallets.length) === 1;
  const walletName = target ? walletLabel(target) : '';
  const address = shortenAddress(target?.accounts[0]?.address ?? '');
  const [isPinStep, setIsPinStep] = useState(false);

  const confirmRemoval = useCallback(() => {
    const named = { wallet: walletName, address };
    Alert.alert(
      t('settings.removeWallet.finalTitle', named),
      t('settings.removeWallet.finalBody', named),
      [
        { text: t('common.cancel'), style: 'cancel', onPress: onCancel },
        {
          text: t('settings.removeWallet.confirm'),
          style: 'destructive',
          onPress: () => {
            removeWallet(walletId)
              .then(() => {
                if (!isLastWallet) onRemoved?.();
              })
              .catch((error: unknown) => logger.error('Wallet removal failed', { error }));
          },
        },
      ],
    );
  }, [address, isLastWallet, onCancel, onRemoved, t, walletId, walletName]);

  if (target === null) return null;
  if (!isPinStep) {
    return (
      <Warning
        walletName={walletName}
        address={address}
        isLastWallet={isLastWallet}
        onContinue={() => setIsPinStep(true)}
      />
    );
  }
  return (
    <PinPrompt
      title={t('settings.removeWallet.authTitle')}
      subtitle={t('settings.removeWallet.authSubtitle', { wallet: walletName, address })}
      onVerified={confirmRemoval}
    />
  );
}
