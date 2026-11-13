import { router } from 'expo-router';

import { AddAccountList } from '@/features/manage-accounts';
import { ROUTES } from '@/shared/config';
import { FormScreen } from '@/shared/ui';

/** Picks the recovery-phrase wallet a new account is added to, when there are several. */
export function AddAccountPage() {
  return (
    <FormScreen>
      <AddAccountList
        onAccountAdded={({ walletId, index }) =>
          router.replace({ pathname: ROUTES.personalize, params: { walletId, index, setup: 1 } })
        }
      />
    </FormScreen>
  );
}
