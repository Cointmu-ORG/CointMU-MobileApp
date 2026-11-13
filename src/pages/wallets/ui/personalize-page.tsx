import { router, useLocalSearchParams } from 'expo-router';
import Trash2 from 'lucide-react-native/icons/trash-2';
import { useTranslation } from 'react-i18next';

import { useWalletStore } from '@/entities/wallet';
import { PersonalizeAccount, PersonalizeWallet } from '@/features/manage-accounts';
import { ROUTES } from '@/shared/config';
import { ListRow, ListSection } from '@/shared/ui';

type Params = { walletId?: string; index?: string; setup?: string };

/**
 * The one place a card gets its look. With an account index in the route: that card's name,
 * color and icon (`setup` marks the step after "Add account"). Without one: the wallet's name
 * and color, and the way to remove it. The route carries public data only.
 */
export function PersonalizePage() {
  const { t } = useTranslation();
  const { walletId, index, setup } = useLocalSearchParams<Params>();
  const wallet = useWalletStore(
    (state) => state.wallets.find((candidate) => candidate.id === walletId) ?? null,
  );
  const close = () => router.back();
  if (wallet === null) return null;

  if (index !== undefined) {
    const accountIndex = Number(index);
    if (!Number.isInteger(accountIndex)) return null;
    return (
      <PersonalizeAccount
        account={{ walletId: wallet.id, index: accountIndex }}
        isSetupStep={setup !== undefined}
        onDone={close}
      />
    );
  }
  return (
    <PersonalizeWallet wallet={wallet} isSetupStep={false} onDone={close}>
      <ListSection footer={t('wallets.details.backupHint')}>
        <ListRow
          icon={Trash2}
          title={t('settings.logout.remove')}
          onPress={() =>
            router.replace({ pathname: ROUTES.removeWallet, params: { walletId: wallet.id } })
          }
          isDestructive
        />
      </ListSection>
    </PersonalizeWallet>
  );
}
