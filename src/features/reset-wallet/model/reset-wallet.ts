import { useBalanceStore } from '@/entities/account';
import { useAuthPrefsStore, useSessionStore, wipeAuthRecords } from '@/entities/auth';
import { useTxStore } from '@/entities/transaction';
import { deleteWalletSecret, useWalletStore } from '@/entities/wallet';

/**
 * Wipes every local key and record (architecture §5). Setting status to `none` sends the router
 * back to onboarding. Recovery needs the user's own mnemonic or private key.
 */
export async function resetWallet(): Promise<void> {
  await Promise.all([deleteWalletSecret(), wipeAuthRecords()]);
  useTxStore.getState().clear();
  useBalanceStore.getState().clear();
  useAuthPrefsStore.getState().setBiometricsEnabled(false);
  useSessionStore.getState().lock();
  useWalletStore.getState().reset();
}
