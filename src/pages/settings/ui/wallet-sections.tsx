import { router } from 'expo-router';
import Server from 'lucide-react-native/icons/server';
import Users from 'lucide-react-native/icons/users';
import { useTranslation } from 'react-i18next';

import { useActiveRpcUrl } from '@/entities/network';
import { useAccountLabel, useActiveAccount } from '@/entities/wallet';
import { ROUTES } from '@/shared/config';
import { formatUrlHost } from '@/shared/lib';
import { ListRow, ListSection } from '@/shared/ui';

/** Accounts and Network: one row each, opening their own screen. */
export function WalletSections() {
  const { t } = useTranslation();
  const label = useAccountLabel();
  const account = useActiveAccount();
  const rpcUrl = useActiveRpcUrl();
  return (
    <>
      <ListSection title={t('settings.accounts.title')}>
        <ListRow
          icon={Users}
          title={t('settings.accounts.row')}
          value={account ? label(account) : undefined}
          onPress={() => router.push(ROUTES.accounts)}
        />
      </ListSection>
      <ListSection title={t('settings.network.title')}>
        <ListRow
          icon={Server}
          title={t('settings.network.row')}
          value={formatUrlHost(rpcUrl)}
          onPress={() => router.push(ROUTES.network)}
        />
      </ListSection>
    </>
  );
}
