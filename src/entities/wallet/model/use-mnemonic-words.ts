import { useEffect, useState } from 'react';

import { logger } from '@/shared/lib';

import { readWalletSecret } from '../api/wallet-secret';
import { splitWords } from '../lib/mnemonic';

export type MnemonicWordsState =
  { status: 'loading' } | { status: 'ready'; words: string[] } | { status: 'error' };

/**
 * Reads a wallet's pending mnemonic from SecureStore into component state for display only.
 * It is never copied into a store, route param or log.
 */
export function useMnemonicWords(walletId: string): MnemonicWordsState {
  const [state, setState] = useState<MnemonicWordsState>({ status: 'loading' });

  useEffect(() => {
    let isActive = true;
    readWalletSecret(walletId)
      .then((secret) => {
        if (!isActive) return;
        if (secret?.kind !== 'mnemonic') throw new Error('No mnemonic stored for backup');
        setState({ status: 'ready', words: splitWords(secret.phrase) });
      })
      .catch((error: unknown) => {
        logger.error('Loading mnemonic for backup failed', { error });
        if (isActive) setState({ status: 'error' });
      });
    return () => {
      isActive = false;
    };
  }, [walletId]);

  return state;
}
