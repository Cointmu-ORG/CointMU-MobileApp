import type { WalletStatus } from '@/entities/wallet';
import { ROUTES, type AppRoute } from '@/shared/config';

/**
 * Where the user belongs for a given wallet status and session state. Used as `redirectTo` for
 * every protected group, so a cold start, a killed app or a guard flip all land on the same
 * screen (architecture §4, D-32).
 */
export function resolveEntryRoute(status: WalletStatus, isUnlocked: boolean): AppRoute {
  switch (status) {
    case 'none':
      return ROUTES.welcome;
    case 'pendingBackup':
      return ROUTES.backup;
    case 'pendingPin':
      return ROUTES.setPin;
    case 'active':
      return isUnlocked ? ROUTES.home : ROUTES.lock;
  }
}
