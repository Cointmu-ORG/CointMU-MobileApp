import { router } from 'expo-router';

import { AddWalletMenu } from '@/features/manage-accounts';
import { ROUTES } from '@/shared/config';

import { SheetScreen } from './sheet-screen';

/** The "+" sheet: add an account, create a wallet or import one. */
export function AddWalletPage() {
  return (
    <SheetScreen>
      <AddWalletMenu
        onDone={() => router.back()}
        onCreate={() => router.replace(ROUTES.walletCreate)}
        onImport={() => router.replace(ROUTES.walletImport)}
      />
    </SheetScreen>
  );
}
