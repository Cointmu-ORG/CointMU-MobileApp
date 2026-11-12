import { useEffect } from 'react';
import { AppState } from 'react-native';

import { applyErrorReportingConsent, flushErrorReports, logger } from '@/shared/lib';
import { useErrorReportingStore } from '@/shared/model';

/**
 * Keeps error reporting in step with the app (D-77): applies the stored choice as soon as it
 * loads and every time it changes, and retries waiting reports when the app comes back to the
 * foreground (the server is reachable only on the campus network).
 */
export function useErrorReporting(): void {
  const hasHydrated = useErrorReportingStore((state) => state.hasHydrated);
  const isEnabled = useErrorReportingStore((state) => state.isEnabled);
  const isNoticeAcknowledged = useErrorReportingStore((state) => state.isNoticeAcknowledged);

  useEffect(() => {
    if (!hasHydrated) return;
    applyErrorReportingConsent({ isEnabled, isNoticeAcknowledged }).catch((error: unknown) =>
      logger.warn('Applying the error reporting choice failed', { error }),
    );
  }, [hasHydrated, isEnabled, isNoticeAcknowledged]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next !== 'active') return;
      flushErrorReports().catch((error: unknown) =>
        logger.warn('Retrying the waiting error reports failed', { error }),
      );
    });
    return () => subscription.remove();
  }, []);
}
