import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { WalletTarget } from '@/entities/wallet';
import { RemoveWalletFlow } from '@/features/reset-wallet';
import { ROUTES } from '@/shared/config';
import { Screen } from '@/shared/ui';

/**
 * Removes the wallet named in the route (a wallet's own page, a card menu). From Settings no
 * wallet is named: the only wallet is taken, and with several the user picks one first (D-94).
 */
export function RemoveWalletPage() {
  const { t } = useTranslation();
  const { walletId } = useLocalSearchParams<{ walletId?: string }>();
  return (
    <Screen>
      <WalletTarget walletId={walletId} includesUnusable prompt={t('settings.removeWallet.pick')}>
        {(wallet) => (
          <RemoveWalletFlow
            walletId={wallet.id}
            onCancel={() => router.back()}
            onRemoved={() => router.dismissTo(ROUTES.wallets)}
          />
        )}
      </WalletTarget>
    </Screen>
  );
}
