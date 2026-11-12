import { useAccountBalancesStore, useBalanceStore } from '@/entities/account';
import { useTokenBalanceStore, useTokenStore } from '@/entities/asset';
import { useAuthPrefsStore, useSessionStore, wipeAuthRecords } from '@/entities/auth';
import { useTxStore } from '@/entities/transaction';
import {
  deleteAllWalletSecrets,
  deleteWalletSecret,
  findWallet,
  useWalletStore,
} from '@/entities/wallet';

/**
 * Wipes every wallet's key and every local record (architecture §5). Setting status to `none`
 * sends the router back to onboarding. Recovery needs the user's own mnemonic or private key.
 */
export async function resetWallet(): Promise<void> {
  const walletIds = useWalletStore.getState().wallets.map((wallet) => wallet.id);
  await Promise.all([deleteAllWalletSecrets(walletIds), wipeAuthRecords()]);
  useTxStore.getState().clear();
  useBalanceStore.getState().clear();
  useAccountBalancesStore.getState().clear();
  useTokenBalanceStore.getState().clear();
  useTokenStore.getState().clear();
  useAuthPrefsStore.getState().setBiometricsEnabled(false);
  useSessionStore.getState().lock();
  useWalletStore.getState().reset();
}

/**
 * Removes one wallet from this device (D-78): its key, its accounts and the local records of
 * transactions it sent. The PIN, the settings and the other wallets stay. Removing the last
 * wallet is a full reset, which returns the app to onboarding. The key is deleted before the
 * wallet leaves the list, so a failure never leaves a key without a wallet to remove it from.
 */
export async function removeWallet(walletId: string): Promise<void> {
  const wallet = findWallet(walletId);
  if (wallet === null) return;
  if (useWalletStore.getState().wallets.length === 1) {
    await resetWallet();
    return;
  }
  await deleteWalletSecret(walletId);
  const addressBefore = useWalletStore.getState().address;
  useWalletStore.getState().removeWallet(walletId);
  useTxStore.getState().removeSentFrom(wallet.accounts.map((account) => account.address));
  if (useWalletStore.getState().address !== addressBefore) {
    useBalanceStore.getState().clear();
    useTokenBalanceStore.getState().clear();
  }
}
