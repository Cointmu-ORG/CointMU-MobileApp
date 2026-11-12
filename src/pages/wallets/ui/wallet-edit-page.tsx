import { router, useLocalSearchParams } from 'expo-router';
import Trash2 from 'lucide-react-native/icons/trash-2';
import { useTranslation } from 'react-i18next';

import { useWalletLabel, useWalletStore } from '@/entities/wallet';
import { WalletDetailsForm } from '@/features/manage-accounts';
import { ROUTES } from '@/shared/config';
import { ListRow, ListSection, Text } from '@/shared/ui';

import { SheetScreen } from './sheet-screen';

/** Name and color of one wallet, and the way to remove it. */
export function WalletEditPage() {
  const { t } = useTranslation();
  const { walletId } = useLocalSearchParams<{ walletId?: string }>();
  const label = useWalletLabel();
  const wallet = useWalletStore(
    (state) => state.wallets.find((candidate) => candidate.id === walletId) ?? null,
  );
  if (wallet === null) return null;

  return (
    <SheetScreen>
      <Text variant="heading" accessibilityRole="header">
        {label(wallet)}
      </Text>
      <WalletDetailsForm
        wallet={wallet}
        submitLabel={t('wallets.details.save')}
        onSaved={() => router.back()}
      />
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
    </SheetScreen>
  );
}
