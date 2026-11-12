import { router, useLocalSearchParams } from 'expo-router';

import { AccountIconSheet, AccountSetup } from '@/features/manage-accounts';

import { SheetScreen } from './sheet-screen';

type Params = { walletId?: string; index?: string; setup?: string };

/**
 * The icon picker of one account card (D-84). With `setup` in the route it is the step after
 * "Add account" and also asks for the name and color. The route carries public data only.
 */
export function AccountIconPage() {
  const { walletId, index, setup } = useLocalSearchParams<Params>();
  const accountIndex = Number(index);
  if (walletId === undefined || !Number.isInteger(accountIndex)) return null;
  const account = { walletId, index: accountIndex };
  const close = () => router.back();

  return (
    <SheetScreen>
      {setup === undefined ? (
        <AccountIconSheet account={account} onDone={close} />
      ) : (
        <AccountSetup account={account} onDone={close} />
      )}
    </SheetScreen>
  );
}
