import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { WalletTarget } from '@/entities/wallet';
import { RevealPrivateKey } from '@/features/reveal-private-key';
import { Screen } from '@/shared/ui';

/**
 * The private key of an account of the wallet in the route, of the only wallet, or of the one
 * picked. `index` names the account; the wallet's first account otherwise.
 */
export function PrivateKeyPage() {
  const { t } = useTranslation();
  const { walletId, index } = useLocalSearchParams<{ walletId?: string; index?: string }>();
  const accountIndex = Number(index);
  return (
    <Screen>
      <WalletTarget walletId={walletId} prompt={t('settings.privateKey.pick')}>
        {(wallet) => (
          <RevealPrivateKey
            walletId={wallet.id}
            index={index !== undefined && Number.isInteger(accountIndex) ? accountIndex : undefined}
          />
        )}
      </WalletTarget>
    </Screen>
  );
}
