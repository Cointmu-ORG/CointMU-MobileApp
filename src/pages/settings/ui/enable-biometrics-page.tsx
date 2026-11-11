import { router } from 'expo-router';

import { EnableBiometricsFlow } from '@/features/lock-settings';
import { FormScreen } from '@/shared/ui';

export function EnableBiometricsPage() {
  return (
    <FormScreen>
      <EnableBiometricsFlow onDone={() => router.back()} />
    </FormScreen>
  );
}
