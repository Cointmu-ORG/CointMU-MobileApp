import { router, useLocalSearchParams } from 'expo-router';

import { RemoveWalletFlow } from '@/features/reset-wallet';
import { ROUTES } from '@/shared/config';
import { Screen } from '@/shared/ui';

/** Removes the wallet named in the route, or the active one (from Settings). */
export function RemoveWalletPage() {
  const { walletId } = useLocalSearchParams<{ walletId?: string }>();
  return (
    <Screen>
      <RemoveWalletFlow
        walletId={walletId}
        onCancel={() => router.back()}
        onRemoved={() => router.dismissTo(ROUTES.wallets)}
      />
    </Screen>
  );
}
