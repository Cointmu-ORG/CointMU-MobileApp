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

import type { AccountRef } from '../model/accounts';
import { useAddAccount } from './use-add-account';

type AddWalletMenuProps = {
  /** Called with the account that was just added: its name, color and icon come next. */
  onAccountAdded: (account: AccountRef) => void;
  /** Several wallets can take a new account: the page that lists them opens. */
  onChooseWallet: () => void;
  onCreate: () => void;
  onImport: () => void;
};

/**
 * The "+" sheet: three actions and nothing else, so it fits without dragging. With one
 * recovery-phrase wallet "Add an account" adds to it at once; with several it opens the page
 * that lists them. New wallets are refused at the limit (D-78).
 */
export function AddWalletMenu(props: AddWalletMenuProps) {
  const { t } = useTranslation();
  const walletLabel = useWalletLabel();
  const wallets = useWalletStore((state) => state.wallets);
  const expandable = selectExpandableWallets(wallets);
  const isAtLimit = wallets.length >= MAX_WALLETS;
  const { add, isAdding, hasFailed } = useAddAccount();
  const only = expandable.length === 1 ? expandable[0] : undefined;

  const addAccount = async () => {
    if (only === undefined) return props.onChooseWallet();
    const index = await add(only.id);
    if (index !== null) props.onAccountAdded({ walletId: only.id, index });
  };

  return (
    <View className="gap-4">
      <Text variant="heading" accessibilityRole="header">
        {t('wallets.add.title')}
      </Text>
      <ListSection footer={isAtLimit ? t('wallets.add.limit', { max: MAX_WALLETS }) : undefined}>
        <ListRow
          icon={UserPlus}
          title={t('wallets.add.account')}
          description={
            only
              ? t('wallets.add.accountIn', { wallet: walletLabel(only) })
              : t(expandable.length > 0 ? 'wallets.add.accountChoose' : 'wallets.add.accountNone')
          }
          onPress={() => void addAccount()}
          isDisabled={isAdding || expandable.length === 0}
        />
        <ListRow
          icon={Sparkles}
          title={t('wallets.add.create')}
          description={t('wallets.add.createHint')}
          onPress={props.onCreate}
          isDisabled={isAtLimit}
        />
        <ListRow
          icon={Download}
          title={t('wallets.add.import')}
          description={t('wallets.add.importHint')}
          onPress={props.onImport}
          isDisabled={isAtLimit}
        />
      </ListSection>
      {hasFailed ? (
        <Text variant="caption" tone="danger" accessibilityLiveRegion="polite">
          {t('wallets.add.accountFailed')}
        </Text>
      ) : null}
    </View>
  );
}
