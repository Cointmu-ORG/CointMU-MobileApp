import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

const ERROR_REPORTING_STORAGE_VERSION = 1;

export type ErrorReportingPrefs = {
  /** Opt-out, like the desktop app: on unless the user turned it off. */
  readonly isEnabled: boolean;
  /** The one-time notice was read. Until then reports are saved on the phone, not sent. */
  readonly isNoticeAcknowledged: boolean;
};

export const DEFAULT_ERROR_REPORTING: ErrorReportingPrefs = {
  isEnabled: true,
  isNoticeAcknowledged: false,
};

/** Validates a stored record field by field; storage is outside the app's control. */
export function migrateErrorReporting(persisted: unknown): ErrorReportingPrefs {
  const stored =
    typeof persisted === 'object' && persisted !== null
      ? (persisted as Record<string, unknown>)
      : {};
  const defaults = DEFAULT_ERROR_REPORTING;
  return {
    isEnabled: typeof stored.isEnabled === 'boolean' ? stored.isEnabled : defaults.isEnabled,
    isNoticeAcknowledged:
      typeof stored.isNoticeAcknowledged === 'boolean'
        ? stored.isNoticeAcknowledged
        : defaults.isNoticeAcknowledged,
  };
}

type ErrorReportingState = ErrorReportingPrefs & {
  hasHydrated: boolean;
  setEnabled: (isEnabled: boolean) => void;
  acknowledgeNotice: () => void;
};

/**
 * The error reporting choice (D-77). Persisted (`muvo.error-reporting`, public data, not a
 * secret) and kept when the wallet is removed: it is a choice about the app, not the wallet.
 */
export const useErrorReportingStore = create<ErrorReportingState>()(
  persist(
    (set) => ({
      ...DEFAULT_ERROR_REPORTING,
      hasHydrated: false,
      setEnabled: (isEnabled) => set({ isEnabled }),
      acknowledgeNotice: () => set({ isNoticeAcknowledged: true }),
    }),
    {
      name: 'muvo.error-reporting',
      version: ERROR_REPORTING_STORAGE_VERSION,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ isEnabled, isNoticeAcknowledged }) => ({ isEnabled, isNoticeAcknowledged }),
      migrate: (persisted) => migrateErrorReporting(persisted),
      merge: (persisted, current) => ({ ...current, ...migrateErrorReporting(persisted) }),
      onRehydrateStorage: () => () => useErrorReportingStore.setState({ hasHydrated: true }),
    },
  ),
);
