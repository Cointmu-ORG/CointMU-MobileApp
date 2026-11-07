import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useAccountLabel, useActiveAccount, useWalletStore } from '@/entities/wallet';
import { logger, shortenAddress } from '@/shared/lib';
import { Button, ListRow, ListSection, RadioMark, Text } from '@/shared/ui';

import { addNextAccount, switchToAccount } from '../model/accounts';
import { RenameAccount } from './rename-account';

/** Settings > Accounts: switch, add (recovery-phrase wallets only) and rename (D-44). */
export function AccountsSettings() {
  const { t } = useTranslation();
  const label = useAccountLabel();
  const accounts = useWalletStore((state) => state.accounts);
  const source = useWalletStore((state) => state.source);
  const active = useActiveAccount();
  const [isAdding, setIsAdding] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);
  const canAdd = source === 'mnemonic';

  const add = async () => {
    setIsAdding(true);
    setHasFailed(false);
    try {
      const result = await addNextAccount();
      if (!result.ok) setHasFailed(true);
    } catch (error) {
      logger.error('Adding an account failed', { error });
      setHasFailed(true);
    } finally {
      setIsAdding(false);
    }
  };

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
