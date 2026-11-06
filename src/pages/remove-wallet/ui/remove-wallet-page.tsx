import { router } from 'expo-router';

import { RemoveWalletFlow } from '@/features/reset-wallet';
import { Screen } from '@/shared/ui';

export function RemoveWalletPage() {
  return (
    <Screen>
      <RemoveWalletFlow onCancel={() => router.back()} />
    </Screen>
  );
}
