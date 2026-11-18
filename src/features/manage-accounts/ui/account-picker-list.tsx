import Check from 'lucide-react-native/icons/check';
import { useEffect } from 'react';
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { balanceOf, useAccountBalancesStore } from '@/entities/account';
import { NATIVE_ASSET } from '@/entities/asset';
import {
  AccountBadge,
  isWalletUsable,
  selectUsableAccounts,
  useAccountLabel,
  useWalletLabel,
  useWalletStore,
  type WalletAccount,
} from '@/entities/wallet';
import { shortenAddress } from '@/shared/lib';
import { COMPACT_BALANCE_LENGTH, useAmountDisplay } from '@/shared/model';
import { ICON_SIZE, ListRow, ListSection, useThemeColors } from '@/shared/ui';

import type { AccountRef } from '../model/accounts';

export const ROW_BADGE_SIZE = 36;
const SECTION_GAP = 16;
const LIST_END_PADDING = 24;

/** An account's native balance as text; "hide balances" masks it. Nothing until it is loaded. */
export function useBalanceText(): (account: WalletAccount) => string | undefined {
  const { formatBalance } = useAmountDisplay();
  const balances = useAccountBalancesStore((state) => state.balances);
  return (account) => {
    const { wei } = balanceOf(balances, account.address);
    if (wei === null) return undefined;
    return `${formatBalance(wei, NATIVE_ASSET.decimals, COMPACT_BALANCE_LENGTH)} ${NATIVE_ASSET.symbol}`;
  };
}

type AccountPickerListProps = {
  /** The account that carries the check mark. */
  selected: AccountRef | null;
  onPick: (account: AccountRef) => void;
  testID: string;
  /** Padding inside the scroll view; a sheet passes its edges and the bottom safe area here. */
  contentStyle?: StyleProp<ViewStyle>;
};

/**
 * The accounts of every usable wallet, grouped by wallet (D-78): icon, name, short address and
 * balance, with a check on the selected one. It scrolls by itself and loads the balances it
 * shows.
 */
export function AccountPickerList({
  selected,
  onPick,
  testID,
  contentStyle,
}: AccountPickerListProps) {
  const colors = useThemeColors();
  const accountLabel = useAccountLabel();
  const walletLabel = useWalletLabel();
  const balanceText = useBalanceText();
  const wallets = useWalletStore((state) => state.wallets);

  useEffect(() => {
    const addresses = selectUsableAccounts(useWalletStore.getState().wallets).map(
      (account) => account.address,
    );
    void useAccountBalancesStore.getState().refresh(addresses);
  }, []);

  return (
    <ScrollView
      testID={testID}
      style={styles.fill}
      // One style, not a class plus a style: NativeWind would let one replace the other.
      contentContainerStyle={[styles.content, contentStyle]}
    >
      {wallets.filter(isWalletUsable).map((wallet) => (
        <ListSection key={wallet.id} title={walletLabel(wallet)}>
          {wallet.accounts.map((account) => {
            const isSelected = selected?.walletId === wallet.id && selected.index === account.index;
            return (
              <ListRow
                key={account.index}
                leading={<AccountBadge account={account} size={ROW_BADGE_SIZE} />}
                title={accountLabel(account)}
                description={shortenAddress(account.address)}
                value={balanceText(account)}
                trailing={
                  isSelected ? (
                    <Check size={ICON_SIZE.md} color={colors.accent.DEFAULT} />
                  ) : (
                    <View className="w-5" />
                  )
                }
                onPress={() => onPick({ walletId: wallet.id, index: account.index })}
                accessibilityRole="radio"
                accessibilityState={{ checked: isSelected }}
              />
            );
          })}
        </ListSection>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { gap: SECTION_GAP, paddingBottom: LIST_END_PADDING },
});
