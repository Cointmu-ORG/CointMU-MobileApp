import Download from 'lucide-react-native/icons/download';
import Sparkles from 'lucide-react-native/icons/sparkles';
import UserPlus from 'lucide-react-native/icons/user-plus';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import {
  MAX_WALLETS,
  selectExpandableWallets,
  useWalletLabel,
  useWalletStore,
} from '@/entities/wallet';
import { ListRow, ListSection, Text } from '@/shared/ui';

import { useAddAccount } from './use-add-account';

type AddWalletMenuProps = {
  /** Called after an account was added: the sheet closes. */
  onDone: () => void;
  onCreate: () => void;
  onImport: () => void;
};

/**
 * The "+" sheet of the Wallets tab: add an account to one of the recovery-phrase wallets, create
 * a new wallet, or import one. New wallets are refused at the limit (D-78).
 */
export function AddWalletMenu({ onDone, onCreate, onImport }: AddWalletMenuProps) {
  const { t } = useTranslation();
  const walletLabel = useWalletLabel();
  const wallets = useWalletStore((state) => state.wallets);
  const expandable = selectExpandableWallets(wallets);
  const isAtLimit = wallets.length >= MAX_WALLETS;
  const { add, isAdding, hasFailed } = useAddAccount();

  const addTo = async (walletId: string) => {
    if (await add(walletId)) onDone();
  };

  return (
    <View className="gap-4">
      <Text variant="heading" accessibilityRole="header">
        {t('wallets.add.title')}
      </Text>
      <ListSection
        title={t('wallets.add.accountTitle')}
        footer={t(expandable.length > 0 ? 'wallets.add.accountHint' : 'wallets.add.accountNone')}
      >
        {expandable.map((wallet) => (
          <ListRow
            key={wallet.id}
            icon={UserPlus}
            title={t('wallets.add.accountIn', { wallet: walletLabel(wallet) })}
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
      <ListSection
        title={t('wallets.add.walletTitle')}
        footer={isAtLimit ? t('wallets.add.limit', { max: MAX_WALLETS }) : undefined}
      >
        <ListRow
          icon={Sparkles}
          title={t('wallets.add.create')}
          description={t('wallets.add.createHint')}
          onPress={onCreate}
          isDisabled={isAtLimit}
        />
        <ListRow
          icon={Download}
          title={t('wallets.add.import')}
          description={t('wallets.add.importHint')}
          onPress={onImport}
          isDisabled={isAtLimit}
        />
      </ListSection>
    </View>
  );
}
