import { Stack } from 'expo-router';

import { useSessionStore } from '@/entities/auth';
import { useWalletStore } from '@/entities/wallet';
import { colors } from '@/shared/ui';

import { resolveEntryRoute } from '../model/resolve-entry-route';

/**
 * Each onboarding step is reachable only in its wallet status (D-32). When the status changes,
 * the router moves to the first screen of the newly allowed group, and a killed app resumes there.
 */
export function OnboardingLayout() {
  const status = useWalletStore((state) => state.status);
  const entryRoute = resolveEntryRoute(
    status,
    useSessionStore((state) => state.isUnlocked),
  );
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: colors.surface.DEFAULT },
      }}
    >
      <Stack.Protected guard={status === 'none'} redirectTo={entryRoute}>
        <Stack.Screen name="welcome" />
        <Stack.Screen name="create" />
        <Stack.Screen name="import" />
      </Stack.Protected>
      <Stack.Protected guard={status === 'pendingBackup'} redirectTo={entryRoute}>
        <Stack.Screen name="backup" />
        <Stack.Screen name="verify" />
      </Stack.Protected>
      <Stack.Protected guard={status === 'pendingPin'} redirectTo={entryRoute}>
        <Stack.Screen name="set-pin" />
      </Stack.Protected>
    </Stack>
  );
}
