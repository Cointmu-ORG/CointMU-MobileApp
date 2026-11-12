import { hasReadablePinRecord } from '@/entities/auth';
import { hasReadableWalletSecret, useWalletStore, type WalletStatus } from '@/entities/wallet';
import { resetWallet } from '@/features/reset-wallet';
import { logger } from '@/shared/lib';

export type WalletDataSnapshot = {
  readonly status: WalletStatus;
  readonly hasPinRecord: boolean;
  /** Every wallet the persisted store lists. */
  readonly walletIds: readonly string[];
  /** The ones whose secret SecureStore could not return in a valid shape. */
  readonly unreadableIds: readonly string[];
};

export type IntegrityVerdict =
  | { readonly kind: 'ok' }
  /** Nothing usable is left: wipe local data and show the recovery screen (D-39). */
  | { readonly kind: 'wipe' }
  /** Some wallets are unreadable; only those need recovery, the rest keep working (D-78). */
  | { readonly kind: 'partial'; readonly unreadableIds: readonly string[] };

/**
 * D-39, per wallet: does the persisted status promise data that SecureStore no longer has?
 * Every status past `none` needs at least one readable wallet secret; `active` needs the PIN
 * record too (it is app-wide and set at the last onboarding step). When the PIN record is gone
 * or no wallet is readable the app cannot be used at all, so everything is wiped. When only
 * some wallets are unreadable, they alone are flagged.
 */
export function assessWalletData({
  status,
  hasPinRecord,
  walletIds,
  unreadableIds,
}: WalletDataSnapshot): IntegrityVerdict {
  if (status === 'none') return { kind: 'ok' };
  if (status === 'active' && !hasPinRecord) return { kind: 'wipe' };
  if (unreadableIds.length >= walletIds.length) return { kind: 'wipe' };
  return unreadableIds.length === 0 ? { kind: 'ok' } : { kind: 'partial', unreadableIds };
}

async function findUnreadable(walletIds: readonly string[]): Promise<string[]> {
  const readable = await Promise.all(walletIds.map((id) => hasReadableWalletSecret(id)));
  return walletIds.filter((_id, position) => !readable[position]);
}

/**
 * Startup check, run after the store is hydrated. When no wallet can be used, wipes everything
 * and flags the recovery screen instead of the lock screen; returns true in that case. When only
 * some wallets are unreadable, flags those (the Wallets tab offers to restore or remove each) and
 * moves the active account to a readable wallet. A store that failed to load is left alone:
 * its empty state says nothing about what SecureStore should hold.
 */
export async function recoverIfWalletDataMissing(): Promise<boolean> {
  const { status, wallets, hasHydrationFailed } = useWalletStore.getState();
  if (status === 'none' || hasHydrationFailed) return false;
  const walletIds = wallets.map((wallet) => wallet.id);
  const [unreadableIds, hasPinRecord] = await Promise.all([
    findUnreadable(walletIds),
    hasReadablePinRecord(),
  ]);
  const verdict = assessWalletData({ status, hasPinRecord, walletIds, unreadableIds });

  if (verdict.kind === 'wipe') {
    logger.warn('Wallet data unreadable at startup; wiping local data', {
      status,
      hasPinRecord,
      walletCount: walletIds.length,
      unreadableCount: unreadableIds.length,
    });
    await resetWallet();
    useWalletStore.getState().requireRecovery();
    return true;
  }
  if (verdict.kind === 'partial') {
    logger.warn('Some wallets are unreadable at startup', {
      walletCount: walletIds.length,
      unreadableCount: unreadableIds.length,
    });
  }
  // Also clears the flag of a wallet that reads fine again.
  useWalletStore.getState().setUnreadableWallets(unreadableIds);
  return false;
}
