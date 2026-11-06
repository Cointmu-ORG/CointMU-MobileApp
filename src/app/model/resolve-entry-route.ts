import type { WalletStatus } from '@/entities/wallet';
import { ROUTES, type AppRoute } from '@/shared/config';

export type EntryState = {
  readonly status: WalletStatus;
  readonly isUnlocked: boolean;
  readonly isRecoveryRequired: boolean;
};

/**
 * Where the user belongs for a given wallet status and session state. Used as `redirectTo` for
 * every protected group, so a cold start, a killed app or a guard flip all land on the same
 * screen (architecture §4, D-32, D-39).
 */
export function resolveEntryRoute({
  status,
  isUnlocked,
  isRecoveryRequired,
}: EntryState): AppRoute {
  switch (status) {
    case 'none':
      return isRecoveryRequired ? ROUTES.recover : ROUTES.welcome;
    case 'pendingBackup':
      return ROUTES.backup;
    case 'pendingPin':
      return ROUTES.setPin;
    case 'active':
      return isUnlocked ? ROUTES.home : ROUTES.lock;
  }
}
