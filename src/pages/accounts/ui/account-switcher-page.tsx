import { router } from 'expo-router';
import { ScrollView } from 'react-native';

import { AccountSwitcher } from '@/features/manage-accounts';
import { ROUTES } from '@/shared/config';

/**
 * Account switcher, presented as a form sheet from the home account chip. The ScrollView is the
 * root so the sheet can grow to its larger detent while the list scrolls.
 */
export function AccountSwitcherPage() {
  return (
    <ScrollView
      className="flex-1 bg-surface-card"
      contentContainerClassName="gap-4 px-6 pb-10 pt-8"
      keyboardShouldPersistTaps="handled"
    >
      <AccountSwitcher
        onDone={() => router.back()}
        onManage={() => router.replace(ROUTES.accounts)}
      />
    </ScrollView>
  );
}
