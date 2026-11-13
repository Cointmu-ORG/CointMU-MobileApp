import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AccountBadge, useAccountLabel, useActiveAccount } from '@/entities/wallet';
import { shortenAddress } from '@/shared/lib';
import { ListRow, ListSection, Text } from '@/shared/ui';

import { switchToAccount } from '../model/accounts';
import { AccountPickerList, ROW_BADGE_SIZE, useBalanceText } from './account-picker-list';

type AccountSwitcherProps = {
  /** Called after a pick: the sheet closes. */
  onDone: () => void;
};

/**
 * Picks the account to send from, for the send being written only; the default account is not
 * changed (D-92). The account in use stays at the top, outside the list, so it and the first
 * rows are visible however long the list is; only the list scrolls.
 */
export function AccountSwitcher({ onDone }: AccountSwitcherProps) {
  const { t } = useTranslation();
  const accountLabel = useAccountLabel();
  const balanceText = useBalanceText();
  const active = useActiveAccount();

  return (
    <View className="flex-1 gap-4">
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
      <AccountPickerList
        testID="account-switcher-list"
        selected={active}
        onPick={(account) => {
          switchToAccount(account);
          onDone();
        }}
      />
    </View>
  );
}
