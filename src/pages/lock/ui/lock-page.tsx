import { useConfirmReset } from '@/features/reset-wallet';
import { UnlockForm } from '@/features/unlock-app';
import { Screen } from '@/shared/ui';

export function LockPage() {
  const requestReset = useConfirmReset();
  return (
    <Screen>
      <UnlockForm onResetRequested={requestReset} />
    </Screen>
  );
}
