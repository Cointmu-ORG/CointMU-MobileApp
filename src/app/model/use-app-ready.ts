import { useEffect, useState } from 'react';

import { useWalletStore } from '@/entities/wallet';
import { logger } from '@/shared/lib';

import { ensureFreshInstallState } from './fresh-install';

/** True once the fresh-install check ran and the persisted wallet status is loaded. */
export function useAppReady(): boolean {
  const [isInstallChecked, setIsInstallChecked] = useState(false);
  const hasHydrated = useWalletStore((state) => state.hasHydrated);

  useEffect(() => {
    ensureFreshInstallState()
      // Safe to continue: a fresh install starts at onboarding, which overwrites every key.
      .catch((error: unknown) => logger.error('Fresh-install check failed', { error }))
      .finally(() => setIsInstallChecked(true));
  }, []);

  return isInstallChecked && hasHydrated;
}
