import '../styles/global.css';
import '@/shared/i18n';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';

import { useSessionStore } from '@/entities/auth';
import { useWalletStore } from '@/entities/wallet';
import { colors } from '@/shared/ui';

import { useAppReady } from '../model/use-app-ready';
import { resolveEntryRoute } from '../model/resolve-entry-route';
import { useAutoLock } from '../model/use-auto-lock';
import { holdNativeSplash, SplashHandoff } from './splash-handoff';

holdNativeSplash();

const SUB_SCREEN_HEADER = {
  headerShown: true,
  headerTitle: '',
  headerShadowVisible: false,
  headerTintColor: colors.primary[600],
  headerStyle: { backgroundColor: colors.surface.DEFAULT },
} as const;

/** Sub-screens (Settings, token management), each below a native header with a back button. */
const SETTINGS_SCREENS = [
  { name: 'network', titleKey: 'settings.network.title' },
  { name: 'accounts', titleKey: 'settings.accounts.title' },
  { name: 'change-pin', titleKey: 'settings.changePin.title' },
  { name: 'recovery-phrase', titleKey: 'settings.recoveryPhrase.title' },
  { name: 'remove-wallet', titleKey: 'settings.removeWallet.title' },
  { name: 'tokens', titleKey: 'tokens.title' },
] as const;

/**
 * Auth guard (architecture §4). Protected groups follow wallet status and session state, and
 * Expo Router redirects automatically when a guard flips, so protected screens never render.
 */
export function RootLayout() {
  const { t } = useTranslation();
  const isReady = useAppReady();
  const status = useWalletStore((state) => state.status);
  const isUnlocked = useSessionStore((state) => state.isUnlocked);
  const isRecoveryRequired = useWalletStore((state) => state.isRecoveryRequired);
  useAutoLock();

  // The native splash stays up until bootstrap is done, so nothing unstyled ever shows.
  if (!isReady) return null;

  const isActive = status === 'active';
  const entryRoute = resolveEntryRoute({ status, isUnlocked, isRecoveryRequired });
  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          contentStyle: { backgroundColor: colors.surface.DEFAULT },
        }}
      >
        <Stack.Protected guard={!isActive} redirectTo={entryRoute}>
          <Stack.Screen name="(onboarding)" />
        </Stack.Protected>
        <Stack.Protected guard={isActive && !isUnlocked} redirectTo={entryRoute}>
          <Stack.Screen name="lock" />
        </Stack.Protected>
        <Stack.Protected guard={isActive && isUnlocked} redirectTo={entryRoute}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="send" options={SUB_SCREEN_HEADER} />
          <Stack.Screen name="receive" options={SUB_SCREEN_HEADER} />
          <Stack.Screen name="scan" options={SUB_SCREEN_HEADER} />
          {SETTINGS_SCREENS.map(({ name, titleKey }) => (
            <Stack.Screen
              key={name}
              name={name}
              options={{ ...SUB_SCREEN_HEADER, headerTitle: t(titleKey) }}
            />
          ))}
        </Stack.Protected>
      </Stack>
      <SplashHandoff />
    </>
  );
}
