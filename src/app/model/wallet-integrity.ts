import { hasReadablePinRecord } from '@/entities/auth';
import { hasReadableWalletSecret, useWalletStore, type WalletStatus } from '@/entities/wallet';
import { resetWallet } from '@/features/reset-wallet';
import { logger } from '@/shared/lib';

export type WalletDataSnapshot = {
  readonly status: WalletStatus;
  readonly hasSecret: boolean;
  readonly hasPinRecord: boolean;
};

/**
 * D-39: the persisted status promises data that SecureStore no longer has. Every status past
 * `none` needs the secret; only `active` needs the PIN record too (it is set at the last step).
 */
export function isWalletDataMissing({
  status,
  hasSecret,
  hasPinRecord,
}: WalletDataSnapshot): boolean {
  switch (status) {
    case 'none':
      return false;
    case 'pendingBackup':
    case 'pendingPin':
      return !hasSecret;
    case 'active':
      return !hasSecret || !hasPinRecord;
  }
}

/**
 * Startup check, run after the store is hydrated. When local wallet data is missing or
 * unreadable, wipes everything and flags the recovery screen instead of the lock screen.
 * Returns true when recovery was triggered.
 */
export async function recoverIfWalletDataMissing(): Promise<boolean> {
  const { status } = useWalletStore.getState();
  if (status === 'none') return false;
  const [hasSecret, hasPinRecord] = await Promise.all([
    hasReadableWalletSecret(),
    hasReadablePinRecord(),
  ]);
  if (!isWalletDataMissing({ status, hasSecret, hasPinRecord })) return false;

  logger.warn('Wallet data unreadable at startup; wiping local data', {
    status,
    hasSecret,
    hasPinRecord,
  });
  await resetWallet();
  useWalletStore.getState().requireRecovery();
  return true;
}
