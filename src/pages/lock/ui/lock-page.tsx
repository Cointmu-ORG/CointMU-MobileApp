import { View } from 'react-native';

import { useConfirmReset } from '@/features/reset-wallet';
import { UnlockForm } from '@/features/unlock-app';
import { BrandMark, Screen } from '@/shared/ui';

const LOGO_SIZE = 48;

export function LockPage() {
  const requestReset = useConfirmReset();
  return (
    <Screen>
      <View className="items-center pt-4">
        <BrandMark size={LOGO_SIZE} />
      </View>
      <UnlockForm onResetRequested={requestReset} />
    </Screen>
  );
}
