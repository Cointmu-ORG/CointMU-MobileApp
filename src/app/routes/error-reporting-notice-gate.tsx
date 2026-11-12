import { useEffect } from 'react';
import { BackHandler, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSessionStore } from '@/entities/auth';
import { useWalletStore } from '@/entities/wallet';
import { ErrorReportingNotice } from '@/features/error-reporting';
import { isErrorReportingAvailable } from '@/shared/lib';
import { useErrorReportingStore } from '@/shared/model';

/** True while the one-time notice is owed: reporting is set up, the wallet is open, not yet read. */
function useIsNoticeDue(): boolean {
  const hasHydrated = useErrorReportingStore((state) => state.hasHydrated);
  const isAcknowledged = useErrorReportingStore((state) => state.isNoticeAcknowledged);
  const isActive = useWalletStore((state) => state.status === 'active');
  const isUnlocked = useSessionStore((state) => state.isUnlocked);
  return isErrorReportingAvailable() && hasHydrated && !isAcknowledged && isActive && isUnlocked;
}

/**
 * Shows the error reporting notice once, over the app (D-77): right after the PIN is set, or on
 * the next unlock for an install that predates it. It follows wallet and session state like the
 * auth guard does, so no screen has to navigate to it; a locked app never shows it.
 */
export function ErrorReportingNoticeGate() {
  const isDue = useIsNoticeDue();

  // Android back must not skip the notice; "Got it" is the way out.
  useEffect(() => {
    if (!isDue) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => subscription.remove();
  }, [isDue]);

  if (!isDue) return null;
  return (
    <SafeAreaView
      testID="error-reporting-notice"
      className="bg-surface"
      style={StyleSheet.absoluteFill}
      accessibilityViewIsModal
    >
      <ScrollView contentContainerClassName="grow justify-center px-6 py-8">
        <ErrorReportingNotice />
      </ScrollView>
    </SafeAreaView>
  );
}
