import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useAccountLabel, useActiveAccount, useWalletStore } from '@/entities/wallet';
import { shortenAddress } from '@/shared/lib';
import { Button, ListRow, ListSection, RadioMark, Text } from '@/shared/ui';

import { switchToAccount } from '../model/accounts';
import { RenameAccount } from './rename-account';
import { useAddAccount } from './use-add-account';

/** Settings > Accounts: switch, add (recovery-phrase wallets only) and rename (D-44). */
export function AccountsSettings() {
  const { t } = useTranslation();
  const label = useAccountLabel();
  const accounts = useWalletStore((state) => state.accounts);
  const source = useWalletStore((state) => state.source);
  const active = useActiveAccount();
  const { add, isAdding, hasFailed } = useAddAccount();
  const canAdd = source === 'mnemonic';

  return (
    <View className="gap-6">
      <ListSection title={t('settings.accounts.listTitle')}>
        {accounts.map((account) => (
          <ListRow
            key={account.index}
            title={label(account)}
            description={shortenAddress(account.address)}
            leading={<RadioMark isSelected={account.index === active?.index} />}
            onPress={() => switchToAccount(account.index)}
            accessibilityRole="radio"
            accessibilityState={{ checked: account.index === active?.index }}
          />
        ))}
      </ListSection>
      <View className="gap-3">
        <Button
          label={t('settings.accounts.add')}
          variant="secondary"
          onPress={() => void add()}
          isLoading={isAdding}
          isDisabled={!canAdd}
        />
        <Text
          variant="caption"
          tone={hasFailed ? 'danger' : 'secondary'}
          accessibilityLiveRegion="polite"
        >
          {hasFailed
            ? t('settings.accounts.addFailed')
            : t(canAdd ? 'settings.accounts.addHint' : 'settings.accounts.privateKeyHint')}
        </Text>
      </View>
      {active ? <RenameAccount key={active.index} account={active} /> : null}
    </View>
  );
}
