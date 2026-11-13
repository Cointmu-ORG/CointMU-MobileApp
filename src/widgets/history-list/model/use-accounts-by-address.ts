import { useMemo } from 'react';

import { useUsableAccounts, type ActiveAccount } from '@/entities/wallet';

/** The usable accounts by lowercase address, to name the account a history row belongs to. */
export function useAccountsByAddress(): ReadonlyMap<string, ActiveAccount> {
  const accounts = useUsableAccounts();
  return useMemo(
    () => new Map(accounts.map((account) => [account.address.toLowerCase(), account])),
    [accounts],
  );
}
