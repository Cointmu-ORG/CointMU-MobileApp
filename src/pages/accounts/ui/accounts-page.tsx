import { AccountsSettings } from '@/features/manage-accounts';
import { FormScreen } from '@/shared/ui';

export function AccountsPage() {
  return (
    <FormScreen>
      <AccountsSettings />
    </FormScreen>
  );
}
