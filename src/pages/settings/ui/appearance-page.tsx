import { AppearanceSettings } from '@/features/change-appearance';
import { FormScreen } from '@/shared/ui';

export function AppearancePage() {
  return (
    <FormScreen>
      <AppearanceSettings />
    </FormScreen>
  );
}
