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
import { useTxPolling } from '../model/use-tx-polling';
import { SUB_SCREEN_HEADER } from './header-options';
import { holdNativeSplash, SplashHandoff } from './splash-handoff';

holdNativeSplash();

/** Sub-screens, each below a native header with a back button and a translated title. */
const SUB_SCREENS = [
  { name: 'send/index', titleKey: 'send.title' },
  { name: 'send/review', titleKey: 'send.review.title' },
  { name: 'receive', titleKey: 'receive.title' },
  { name: 'scan', titleKey: 'scan.title' },
  { name: 'network', titleKey: 'settings.network.title' },
  { name: 'accounts', titleKey: 'settings.accounts.title' },
  { name: 'change-pin', titleKey: 'settings.changePin.title' },
  { name: 'recovery-phrase', titleKey: 'settings.recoveryPhrase.title' },
  { name: 'remove-wallet', titleKey: 'settings.removeWallet.title' },
  { name: 'tokens', titleKey: 'tokens.title' },
  { name: 'tx/[hash]', titleKey: 'history.detail.title' },
] as const;

// Half height first; drag up to full height for a long account list.
const ACCOUNT_SHEET_DETENTS = [0.5, 1];
const ACCOUNT_SHEET_CORNER_RADIUS = 24;

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
  useTxPolling(isReady && status === 'active');

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
          {/* The title is the fallback back label; a group name must never reach the UI. */}
          <Stack.Screen name="(tabs)" options={{ title: t('tabs.home') }} />
          {SUB_SCREENS.map(({ name, titleKey }) => (
            <Stack.Screen
              key={name}
              name={name}
              options={{ ...SUB_SCREEN_HEADER, headerTitle: t(titleKey) }}
            />
          ))}
          {/* Bottom sheet; Android renders no native header inside a form sheet. */}
          <Stack.Screen
            name="account-switcher"
            options={{
              presentation: 'formSheet',
              animation: 'slide_from_bottom',
              sheetAllowedDetents: ACCOUNT_SHEET_DETENTS,
              sheetGrabberVisible: true,
              sheetCornerRadius: ACCOUNT_SHEET_CORNER_RADIUS,
              contentStyle: { backgroundColor: colors.surface.card },
            }}
          />
          {/* Already broadcast: no back button or swipe-back into the signing step (D-53). */}
          <Stack.Screen
            name="send/result"
            options={{ ...SUB_SCREEN_HEADER, headerBackVisible: false, gestureEnabled: false }}
          />
        </Stack.Protected>
      </Stack>
      <SplashHandoff />
    </>
  );
}
