import { router } from 'expo-router';

import { AccountSwitcher } from '@/features/manage-accounts';

/**
 * The account picker of the send form, on a sheet of one fixed height: the account in use and
 * the first rows show at once, and a long list scrolls inside the sheet. The switcher owns the
 * sheet's background and padding.
 */
export function AccountSwitcherPage() {
  return <AccountSwitcher onDone={() => router.back()} />;
}
