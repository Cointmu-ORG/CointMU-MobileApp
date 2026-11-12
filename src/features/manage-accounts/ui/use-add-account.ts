import { useCallback, useState } from 'react';

import { logger } from '@/shared/lib';

import { addNextAccount } from '../model/accounts';

/** "Add account" with its progress and failure state. Resolves true when an account was added. */
export function useAddAccount() {
  const [isAdding, setIsAdding] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);

  const add = useCallback(async (walletId: string): Promise<boolean> => {
    setIsAdding(true);
    setHasFailed(false);
    try {
      const result = await addNextAccount(walletId);
      if (!result.ok) setHasFailed(true);
      return result.ok;
    } catch (error) {
      logger.error('Adding an account failed', { error });
      setHasFailed(true);
      return false;
    } finally {
      setIsAdding(false);
    }
  }, []);

  return { add, isAdding, hasFailed };
}
