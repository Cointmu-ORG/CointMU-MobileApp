import { SendStatus } from '@/features/send-transaction';
import { FormScreen } from '@/shared/ui';

export function SendResultPage() {
  return (
    <FormScreen>
      <SendStatus />
    </FormScreen>
  );
}
