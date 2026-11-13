import { router } from 'expo-router';
import { View } from 'react-native';

import { AccountSwitcher } from '@/features/manage-accounts';

/**
 * The account picker of the send form, on a sheet of one fixed height: the account in use and
 * the first rows show at once, and a long list scrolls inside the sheet.
 */
export function AccountSwitcherPage() {
  return (
    <View className="flex-1 bg-surface-card px-6 pt-8">
      <AccountSwitcher onDone={() => router.back()} />
    </View>
  );
}
