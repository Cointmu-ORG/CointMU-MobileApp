import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AccountBadge, useAccountLabel, useActiveAccount } from '@/entities/wallet';
import { shortenAddress } from '@/shared/lib';
import { ListRow, ListSection, Text, useThemeColors } from '@/shared/ui';

import { switchToAccount } from '../model/accounts';
import { AccountPickerList, ROW_BADGE_SIZE, useBalanceText } from './account-picker-list';

/** One inset for the title, the sections and the list, so everything lines up with the sheet. */
const SHEET_PADDING = 20;
const SHEET_TOP_PADDING = 24;
const SHEET_GAP = 16;

type AccountSwitcherProps = {
  /** Called after a pick: the sheet closes. */
  onDone: () => void;
};

/**
 * The "Send from" sheet: picks the account to send from, for the send being written only; the
 * default account is not changed (D-92). The account in use stays at the top, outside the list,
 * so it and the first rows are visible however long the list is; only the list scrolls. The
 * sheet paints its own opaque background and pads every part by the same inset, with the bottom
 * safe area inside the scroll content so the last row clears the home indicator.
 */
export function AccountSwitcher({ onDone }: AccountSwitcherProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const accountLabel = useAccountLabel();
  const balanceText = useBalanceText();
  const active = useActiveAccount();

  return (
    <View
      testID="account-switcher-sheet"
      style={[styles.sheet, { backgroundColor: colors.surface.card }]}
    >
      <View style={styles.top}>
        <Text variant="heading" accessibilityRole="header">
          {t('accounts.switcher.title')}
        </Text>
        {active ? (
          <ListSection title={t('accounts.switcher.current')}>
            <ListRow
              leading={<AccountBadge account={active} size={ROW_BADGE_SIZE} />}
              title={accountLabel(active)}
              description={shortenAddress(active.address)}
              value={balanceText(active)}
            />
          </ListSection>
        ) : null}
      </View>
      <AccountPickerList
        testID="account-switcher-list"
        selected={active}
        contentStyle={[styles.list, { paddingBottom: insets.bottom + SHEET_PADDING }]}
        onPick={(account) => {
          switchToAccount(account);
          onDone();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, paddingTop: SHEET_TOP_PADDING },
  top: { gap: SHEET_GAP, paddingHorizontal: SHEET_PADDING, paddingBottom: SHEET_GAP },
  list: { paddingHorizontal: SHEET_PADDING },
});
