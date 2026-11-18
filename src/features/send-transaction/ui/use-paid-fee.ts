import { useEffect, useState } from 'react';

import { getProvider } from '@/entities/network';
import { fetchTxFee } from '@/entities/transaction';
import { logger } from '@/shared/lib';

/**
 * The fee actually paid, read from the receipt once the transaction is in a block; null before.
 * The transaction detail page has the same hook: two copies, below the rule of three.
 */
export function usePaidFee(hash: string | null, isMined: boolean): bigint | null {
  const [fee, setFee] = useState<bigint | null>(null);
  useEffect(() => {
    if (hash === null || !isMined) return;
    fetchTxFee(getProvider(), hash)
      .then(setFee)
      .catch((error: unknown) => logger.warn('Reading the tx fee failed', { error }));
  }, [hash, isMined]);
  return fee;
}
