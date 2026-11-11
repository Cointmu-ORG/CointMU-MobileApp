import { useEffect, useState } from 'react';

import { useWalletStore } from '@/entities/wallet';
import { restoreLanguage } from '@/shared/i18n';
import { logger } from '@/shared/lib';
import { useAppearanceStore } from '@/shared/model';

import { ensureFreshInstallState } from './fresh-install';
import { recoverIfWalletDataMissing } from './wallet-integrity';

/**
 * True once startup checks are done: the fresh-install wipe (D-33) and the stored language, store
 * hydration, then the wallet data integrity check (D-39), so the guard never routes on stale
 * status and the first screen is already in the right language. The splash covers all of it.
 */
export function useAppReady(): boolean {
  const [isInstallChecked, setIsInstallChecked] = useState(false);
  const [isIntegrityChecked, setIsIntegrityChecked] = useState(false);
  const hasHydrated = useWalletStore((state) => state.hasHydrated);
  // The first frame must already be in the stored theme and accent.
  const hasAppearance = useAppearanceStore((state) => state.hasHydrated);

  useEffect(() => {
    const install = ensureFreshInstallState()
      // Safe to continue: a fresh install starts at onboarding, which overwrites every key.
      .catch((error: unknown) => logger.error('Fresh-install check failed', { error }));
    const language = restoreLanguage()
      // Safe to continue in the device language.
      .catch((error: unknown) => logger.warn('Restoring the language failed', { error }));
    void Promise.all([install, language]).finally(() => setIsInstallChecked(true));
  }, []);

  useEffect(() => {
    if (!isInstallChecked || !hasHydrated) return;
    recoverIfWalletDataMissing()
      // On failure the lock screen still works: with no PIN record every attempt fails and the
      // reset offer appears after the lockout limit.
      .catch((error: unknown) => logger.error('Wallet integrity check failed', { error }))
      .finally(() => setIsIntegrityChecked(true));
  }, [isInstallChecked, hasHydrated]);

  return isIntegrityChecked && hasAppearance;
}
