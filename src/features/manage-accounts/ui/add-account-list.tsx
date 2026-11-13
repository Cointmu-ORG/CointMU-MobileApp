import UserPlus from 'lucide-react-native/icons/user-plus';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { selectExpandableWallets, useWalletLabel, useWalletStore } from '@/entities/wallet';
import { ListRow, ListSection, Text } from '@/shared/ui';

import type { AccountRef } from '../model/accounts';
import { useAddAccount } from './use-add-account';

type AddAccountListProps = {
  /** Called with the account that was just added: its name, color and icon come next. */
  onAccountAdded: (account: AccountRef) => void;
};

/** Every recovery-phrase wallet that can take another account; a tap adds one to it. */
export function AddAccountList({ onAccountAdded }: AddAccountListProps) {
  const { t } = useTranslation();
  const walletLabel = useWalletLabel();
  const wallets = useWalletStore((state) => state.wallets);
  const { add, isAdding, hasFailed } = useAddAccount();

  const addTo = async (walletId: string) => {
    const index = await add(walletId);
    if (index !== null) onAccountAdded({ walletId, index });
  };

  return (
    <View className="gap-4">
      <ListSection title={t('wallets.add.accountTitle')} footer={t('wallets.add.accountHint')}>
        {selectExpandableWallets(wallets).map((wallet) => (
          <ListRow
            key={wallet.id}
            icon={UserPlus}
            title={walletLabel(wallet)}
            description={t('wallets.add.accountCount', { count: wallet.accounts.length })}
            onPress={() => void addTo(wallet.id)}
            isDisabled={isAdding}
          />
        ))}
      </ListSection>
      {hasFailed ? (
        <Text variant="caption" tone="danger" accessibilityLiveRegion="polite">
          {t('wallets.add.accountFailed')}
        </Text>
      ) : null}
    </View>
  );
}
