import { router } from 'expo-router';

import { AddWalletMenu } from '@/features/manage-accounts';
import { ROUTES } from '@/shared/config';

import { SheetScreen } from './sheet-screen';

/** The "+" sheet: add an account (its name, color and icon come next), create a wallet or import one. */
export function AddWalletPage() {
  return (
    <SheetScreen>
      <AddWalletMenu
        onAccountAdded={({ walletId, index }) =>
          router.replace({ pathname: ROUTES.personalize, params: { walletId, index, setup: 1 } })
        }
        onChooseWallet={() => router.replace(ROUTES.addAccount)}
        onCreate={() => router.replace(ROUTES.walletCreate)}
        onImport={() => router.replace(ROUTES.walletImport)}
      />
    </SheetScreen>
  );
}
