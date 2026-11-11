import { Stack } from 'expo-router';

import { useSessionStore } from '@/entities/auth';
import { useWalletStore } from '@/entities/wallet';
import { useThemeColors } from '@/shared/ui';

import { resolveEntryRoute } from '../model/resolve-entry-route';
import { useSubScreenHeader } from './header-options';

/**
 * Each onboarding step is reachable only in its wallet status (D-32); the recovery screen only
 * after unreadable wallet data was wiped (D-39). When the status changes,
 * the router moves to the first screen of the newly allowed group, and a killed app resumes there.
 */
export function OnboardingLayout() {
  const colors = useThemeColors();
  const subScreenHeader = useSubScreenHeader();
  const status = useWalletStore((state) => state.status);
  const isRecoveryRequired = useWalletStore((state) => state.isRecoveryRequired);
  const isUnlocked = useSessionStore((state) => state.isUnlocked);
  const entryRoute = resolveEntryRoute({ status, isUnlocked, isRecoveryRequired });
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: colors.surface.DEFAULT },
      }}
    >
      <Stack.Protected guard={status === 'none' && isRecoveryRequired} redirectTo={entryRoute}>
        <Stack.Screen name="recover" />
      </Stack.Protected>
      <Stack.Protected guard={status === 'none' && !isRecoveryRequired} redirectTo={entryRoute}>
        <Stack.Screen name="welcome" />
        <Stack.Screen name="create" />
        <Stack.Screen name="import" options={subScreenHeader} />
      </Stack.Protected>
      <Stack.Protected guard={status === 'pendingBackup'} redirectTo={entryRoute}>
        <Stack.Screen name="backup" />
        <Stack.Screen name="verify" options={subScreenHeader} />
      </Stack.Protected>
      <Stack.Protected guard={status === 'pendingPin'} redirectTo={entryRoute}>
        <Stack.Screen name="set-pin" />
      </Stack.Protected>
    </Stack>
  );
}
