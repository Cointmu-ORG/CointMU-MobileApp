import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { isWalletUsable, type ActiveAccount, type WalletAccount, type WalletRecord } from './types';
import { useWalletStore } from './wallet-store';

/** The user's name for an account, or "Account N" (1-based) when it has none. */
export function useAccountLabel(): (account: WalletAccount) => string {
  const { t } = useTranslation();
  return (account) => account.name ?? t('accounts.defaultName', { number: account.index + 1 });
}

/** The user's name for a wallet, or "Wallet N" when it has none. */
export function useWalletLabel(): (wallet: WalletRecord) => string {
  const { t } = useTranslation();
  return (wallet) => wallet.name ?? t('wallets.defaultName', { number: wallet.number });
}

export function useActiveWallet(): WalletRecord | null {
  return useWalletStore(
    (state) => state.wallets.find((wallet) => wallet.id === state.activeWalletId) ?? null,
  );
}

/** The active account with its wallet id, which is what signing and reveals look the secret up by. */
export function useActiveAccount(): ActiveAccount | null {
  const wallet = useActiveWallet();
  const accountIndex = useWalletStore((state) => state.accountIndex);
  return useMemo(() => {
    const account = wallet?.accounts.find((candidate) => candidate.index === accountIndex);
    return wallet && account ? { ...account, walletId: wallet.id } : null;
  }, [wallet, accountIndex]);
}

/** The default account for transfers (D-92), with its wallet id. */
export function useDefaultAccount(): ActiveAccount | null {
  return useAccount(useWalletStore((state) => state.defaultAccount));
}

/** Same as `useDefaultAccount`, outside React. */
export function getDefaultAccount(): ActiveAccount | null {
  const { wallets, defaultAccount } = useWalletStore.getState();
  const wallet = wallets.find((candidate) => candidate.id === defaultAccount?.walletId);
  const account = wallet?.accounts.find((candidate) => candidate.index === defaultAccount?.index);
  return wallet && account ? { ...account, walletId: wallet.id } : null;
}

/** Every account that can be used right now, in wallet order, each with its wallet id. */
export function selectUsableAccounts(wallets: readonly WalletRecord[]): ActiveAccount[] {
  return wallets
    .filter(isWalletUsable)
    .flatMap((wallet) => wallet.accounts.map((account) => ({ ...account, walletId: wallet.id })));
}

export function useUsableAccounts(): ActiveAccount[] {
  const wallets = useWalletStore((state) => state.wallets);
  return useMemo(() => selectUsableAccounts(wallets), [wallets]);
}

/** One account by wallet id and index, whatever the state of its wallet. */
export function useAccount(
  ref: { readonly walletId: string; readonly index: number } | null,
): ActiveAccount | null {
  const wallet = useWalletStore(
    (state) => state.wallets.find((candidate) => candidate.id === ref?.walletId) ?? null,
  );
  const index = ref?.index;
  return useMemo(() => {
    const account = wallet?.accounts.find((candidate) => candidate.index === index);
    return wallet && account ? { ...account, walletId: wallet.id } : null;
  }, [wallet, index]);
}

/** Same as `useActiveAccount`, outside React. */
export function getActiveAccount(): ActiveAccount | null {
  const { wallets, activeWalletId, accountIndex } = useWalletStore.getState();
  const wallet = wallets.find((candidate) => candidate.id === activeWalletId);
  const account = wallet?.accounts.find((candidate) => candidate.index === accountIndex);
  return wallet && account ? { ...account, walletId: wallet.id } : null;
}

export function findWallet(walletId: string): WalletRecord | null {
  return useWalletStore.getState().wallets.find((wallet) => wallet.id === walletId) ?? null;
}

/** The wallet that already holds an address, in any of its accounts. */
export function findWalletByAddress(address: string): WalletRecord | null {
  const wanted = address.toLowerCase();
  return (
    useWalletStore
      .getState()
      .wallets.find((wallet) =>
        wallet.accounts.some((account) => account.address.toLowerCase() === wanted),
      ) ?? null
  );
}

/** Mnemonic wallets that can derive another account right now. */
export function selectExpandableWallets(wallets: readonly WalletRecord[]): WalletRecord[] {
  return wallets.filter((wallet) => wallet.source === 'mnemonic' && isWalletUsable(wallet));
}
