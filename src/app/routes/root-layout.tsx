import '../styles/global.css';
import '@/shared/i18n';

import { DarkTheme, DefaultTheme, Stack, ThemeProvider, type Theme } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ReducedMotionConfig, ReduceMotion } from 'react-native-reanimated';

import { useSessionStore } from '@/entities/auth';
import { useWalletStore } from '@/entities/wallet';
import { initErrorReporting } from '@/shared/lib';
import { useAppearanceStore } from '@/shared/model';
import { ThemeRoot, useResolvedTheme, useTheme } from '@/shared/ui';

import { useAppReady } from '../model/use-app-ready';
import { resolveEntryRoute } from '../model/resolve-entry-route';
import { useApplyTheme } from '../model/use-apply-theme';
import { useAutoLock } from '../model/use-auto-lock';
import { useErrorReporting } from '../model/use-error-reporting';
import { useTxPolling } from '../model/use-tx-polling';
import { ErrorReportingNoticeGate } from './error-reporting-notice-gate';
import { useSubScreenHeader } from './header-options';
import { NavigationBreadcrumbs } from './navigation-breadcrumbs';
import { PrivacyCover } from './privacy-cover';
import { holdNativeSplash, SplashHandoff } from './splash-handoff';

holdNativeSplash();
// Before the first screen, so an error during startup is already caught (D-77).
initErrorReporting();

/** Sub-screens, each below a native header with a back button and a translated title. */
const SUB_SCREENS = [
  { name: 'send/index', titleKey: 'send.title' },
  { name: 'send/review', titleKey: 'send.review.title' },
  { name: 'receive', titleKey: 'receive.title' },
  { name: 'scan', titleKey: 'scan.title' },
  { name: 'appearance', titleKey: 'settings.appearance.title' },
  { name: 'language', titleKey: 'settings.language.title' },
  { name: 'network', titleKey: 'settings.network.title' },
  { name: 'security', titleKey: 'settings.security.title' },
  { name: 'enable-biometrics', titleKey: 'settings.biometrics.title' },
  { name: 'wallet-create', titleKey: 'wallets.create.header' },
  { name: 'wallet-import', titleKey: 'onboarding.import.title' },
  { name: 'change-pin', titleKey: 'settings.changePin.title' },
  { name: 'recovery-phrase', titleKey: 'settings.recoveryPhrase.title' },
  { name: 'private-key', titleKey: 'settings.privateKey.title' },
  { name: 'remove-wallet', titleKey: 'settings.removeWallet.title' },
  { name: 'privacy', titleKey: 'settings.privacy.title' },
  { name: 'about', titleKey: 'settings.about.title' },
  { name: 'tokens', titleKey: 'tokens.title' },
  { name: 'tx/[hash]', titleKey: 'history.detail.title' },
] as const;

/** Bottom sheets: the account switcher, the "+" sheet, an account's menu and a wallet's details. */
const SHEET_SCREENS = ['account-switcher', 'wallet-add', 'account-menu', 'wallet-edit'] as const;
// Half height first; drag up to full height for a long list.
const SHEET_DETENTS = [0.5, 1];
const SHEET_CORNER_RADIUS = 24;

/** React Navigation paints the container, headers and tab bar it owns with these. */
function useNavigationTheme(): Theme {
  const { scheme, colors } = useTheme();
  return useMemo(() => {
    const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: colors.accent.DEFAULT,
        background: colors.surface.DEFAULT,
        card: colors.surface.DEFAULT,
        text: colors.content.DEFAULT,
        border: colors.border.DEFAULT,
        notification: colors.danger.DEFAULT,
      },
    };
  }, [scheme, colors]);
}

/**
 * Auth guard (architecture §4). Protected groups follow wallet status and session state, and
 * Expo Router redirects automatically when a guard flips, so protected screens never render.
 */
function RootNavigator() {
  const { t } = useTranslation();
  const { scheme, colors } = useTheme();
  const navigationTheme = useNavigationTheme();
  const subScreenHeader = useSubScreenHeader();
  const status = useWalletStore((state) => state.status);
  const isUnlocked = useSessionStore((state) => state.isUnlocked);
  const isRecoveryRequired = useWalletStore((state) => state.isRecoveryRequired);

  const isActive = status === 'active';
  const entryRoute = resolveEntryRoute({ status, isUnlocked, isRecoveryRequired });

  return (
    <ThemeProvider value={navigationTheme}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
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
              options={{ ...subScreenHeader, headerTitle: t(titleKey) }}
            />
          ))}
          {/* Bottom sheets; Android renders no native header inside a form sheet. */}
          {SHEET_SCREENS.map((name) => (
            <Stack.Screen
              key={name}
              name={name}
              options={{
                presentation: 'formSheet',
                animation: 'slide_from_bottom',
                sheetAllowedDetents: SHEET_DETENTS,
                sheetGrabberVisible: true,
                sheetCornerRadius: SHEET_CORNER_RADIUS,
                contentStyle: { backgroundColor: colors.surface.card },
              }}
            />
          ))}
          {/* Already broadcast: no back button or swipe-back into the signing step (D-53). */}
          <Stack.Screen
            name="send/result"
            options={{ ...subScreenHeader, headerBackVisible: false, gestureEnabled: false }}
          />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}

/**
 * Bootstrap, then the themed app. ThemeRoot is the outermost view: it sets every color variable
 * from its first render (D-63, D-66), and the navigator, the privacy cover and the splash copy
 * all render inside it.
 */
export function RootLayout() {
  const isReady = useAppReady();
  const status = useWalletStore((state) => state.status);
  const motion = useAppearanceStore((state) => state.motion);
  const theme = useResolvedTheme();
  useApplyTheme(theme);
  useAutoLock();
  useErrorReporting();
  useTxPolling(isReady && status === 'active');

  // The native splash stays up until bootstrap is done, so nothing unstyled ever shows.
  if (!isReady) return null;

  return (
    <ThemeRoot theme={theme}>
      {/* Only when overriding: following the system is Reanimated's default, and the component
          logs a dev warning on every mount. */}
      {motion === 'reduced' ? <ReducedMotionConfig mode={ReduceMotion.Always} /> : null}
      <RootNavigator />
      <NavigationBreadcrumbs />
      <ErrorReportingNoticeGate />
      <PrivacyCover />
      <SplashHandoff />
    </ThemeRoot>
  );
}
