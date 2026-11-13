import Pencil from 'lucide-react-native/icons/pencil';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import {
  isWalletUsable,
  useActiveAccount,
  useWalletLabel,
  type WalletRecord,
} from '@/entities/wallet';
import {
  ICON_SIZE,
  PressableSurface,
  SURFACE_PALETTE,
  Text,
  useCardFill,
  useThemeColors,
} from '@/shared/ui';

import type { WalletGridActions } from '../model/types';
import { AccountCard } from './account-card';
import { AttentionCard } from './attention-card';

type WalletSectionProps = { wallet: WalletRecord; actions: WalletGridActions };

function SectionHeader({ wallet, onEdit }: { wallet: WalletRecord; onEdit: () => void }) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const label = useWalletLabel();
  const fill = useCardFill()(wallet.color);
  const name = label(wallet);

  return (
    <View className="flex-row items-center gap-2">
      <View style={[styles.dot, { backgroundColor: fill }]} accessibilityElementsHidden />
      <View className="flex-1">
        <Text variant="label" accessibilityRole="header" numberOfLines={1}>
          {name}
        </Text>
        <Text variant="caption" tone="secondary">
          {t(`wallets.source.${wallet.source}`, { count: wallet.accounts.length })}
        </Text>
      </View>
      <PressableSurface
        palette={SURFACE_PALETTE.ghost}
        className="h-11 w-11 items-center justify-center rounded-full"
        onPress={onEdit}
        accessibilityRole="button"
        accessibilityLabel={t('wallets.editWallet', { wallet: name })}
      >
        <Pencil size={ICON_SIZE.md} color={colors.content.secondary} />
      </PressableSurface>
    </View>
  );
}

/** One wallet: its name as the section header, then its account cards two per row. */
export function WalletSection({ wallet, actions }: WalletSectionProps) {
  const active = useActiveAccount();

  return (
    <View className="gap-3">
      <SectionHeader wallet={wallet} onEdit={() => actions.onEditWallet(wallet.id)} />
      {isWalletUsable(wallet) ? (
        <View className="flex-row flex-wrap justify-between gap-y-3">
          {wallet.accounts.map((account) => {
            const ref = { walletId: wallet.id, index: account.index };
            return (
              <View key={account.index} className="w-[48%]">
                <AccountCard
                  account={account}
                  isActive={active?.walletId === wallet.id && active.index === account.index}
                  onPress={() => actions.onSelectAccount(ref)}
                  onMenu={() => actions.onAccountMenu(ref)}
                />
              </View>
            );
          })}
        </View>
      ) : (
        <AttentionCard
          kind={wallet.needsRecovery ? 'recovery' : 'backup'}
          onResolve={() =>
            wallet.needsRecovery
              ? actions.onRecoverWallet(wallet.id)
              : actions.onResumeBackup(wallet.id)
          }
          onRemove={() => actions.onRemoveWallet(wallet.id)}
        />
      )}
    </View>
  );
}

const DOT_SIZE = 12;

const styles = StyleSheet.create({
  dot: { width: DOT_SIZE, height: DOT_SIZE, borderRadius: DOT_SIZE / 2 },
});
