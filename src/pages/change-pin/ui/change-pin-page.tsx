import { router } from 'expo-router';

import { ChangePinFlow } from '@/features/change-pin';
import { Screen } from '@/shared/ui';

export function ChangePinPage() {
  return (
    <Screen>
      <ChangePinFlow onFinished={() => router.back()} />
    </Screen>
  );
}
