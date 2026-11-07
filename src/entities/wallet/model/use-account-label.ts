import { useTranslation } from 'react-i18next';

import { useWalletStore, type WalletAccount } from './wallet-store';

/** The user's name for an account, or "Account N" (1-based) when it has none. */
export function useAccountLabel(): (account: WalletAccount) => string {
  const { t } = useTranslation();
  return (account) => account.name ?? t('accounts.defaultName', { number: account.index + 1 });
}

export function useActiveAccount(): WalletAccount | null {
  return useWalletStore(
    (state) => state.accounts.find((account) => account.index === state.accountIndex) ?? null,
  );
}
