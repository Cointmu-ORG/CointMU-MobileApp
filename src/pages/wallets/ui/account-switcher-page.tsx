import { router } from 'expo-router';

import { AccountSwitcher } from '@/features/manage-accounts';
import { ROUTES } from '@/shared/config';

import { SheetScreen } from './sheet-screen';

/** Account switcher, presented as a form sheet from the home account chip. */
export function AccountSwitcherPage() {
  return (
    <SheetScreen>
      <AccountSwitcher
        onDone={() => router.back()}
        onAdd={() => router.replace(ROUTES.walletAdd)}
        onManage={() => router.dismissTo(ROUTES.wallets)}
      />
    </SheetScreen>
  );
}
