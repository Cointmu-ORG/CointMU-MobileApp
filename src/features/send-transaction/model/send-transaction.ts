import { Transaction } from 'ethers';

import { getAssetKey } from '@/entities/asset';
import {
  getProvider,
  network,
  probeNode,
  resolveActiveUrl,
  useNetworkStore,
} from '@/entities/network';
import {
  classifySendError,
  feeFields,
  useTxStore,
  type FeeQuote,
  type TxFeeRecord,
} from '@/entities/transaction';
import { readWalletSecret, signWithSecret } from '@/entities/wallet';
import { callRpc } from '@/shared/api';
import { logger } from '@/shared/lib';

import { BROADCAST_TIMEOUT_MS } from '../config/send-config';
import { buildTxRequest } from '../lib/send-math';
import type { SendDraft, SendOutcome, SendStage } from './send-flow-store';

type SendInput = {
  /** Holds the sending account (`draft.from`): the one the user saw in "From" and on the review. */
  readonly draft: SendDraft;
  readonly onStage: (stage: SendStage) => void;
};

function toFeeRecord(quote: FeeQuote): TxFeeRecord {
  const gasLimit = quote.gasLimit.toString();
  return quote.mode === 'eip1559'
    ? {
        mode: 'eip1559',
        gasLimit,
        maxFeePerGas: quote.maxFeePerGas.toString(),
        maxPriorityFeePerGas: quote.maxPriorityFeePerGas.toString(),
      }
    : { mode: 'legacy', gasLimit, gasPrice: quote.gasPrice.toString() };
}

/** Refuses a node that is not on CointMU: a signature must never reach another chain. */
async function ensureCointMuNode(url: string): Promise<SendOutcome | null> {
  const probe = await probeNode(url);
  if (probe.status === 'wrong-chain') return { ok: false, error: 'wrongChain' };
  if (probe.status === 'unreachable') return { ok: false, error: 'network' };
  return null;
}

/**
 * Signs for the draft's source account with the secret of that account's own wallet, read only
 * now, after the caller verified the user. `signWithSecret` refuses a secret that does not produce the account's address.
 */
async function sign(input: SendInput, nonce: number): Promise<string> {
  const { draft } = input;
  const account = draft.from;
  const secret = await readWalletSecret(account.walletId);
  if (secret === null) throw new Error('No wallet secret stored');
  return signWithSecret(secret, account, {
    ...buildTxRequest({ ...draft, from: account.address }),
    nonce,
    gasLimit: draft.quote.gasLimit,
    chainId: network.chainId,
    ...feeFields(draft.quote),
  });
}

function saveRecord(input: SendInput, tx: { hash: string; nonce: number; node: string }): void {
  const { draft } = input;
  const account = draft.from;
  useTxStore.getState().add({
    hash: tx.hash,
    from: account.address,
    to: draft.to,
    value: draft.amount.toString(),
    assetKey: getAssetKey(draft.asset),
    nonce: tx.nonce,
    fee: toFeeRecord(draft.quote),
    node: tx.node,
    createdAt: Date.now(),
    status: 'pending',
    confirmations: 0,
    blockNumber: null,
    unknownSince: null,
  });
}

/**
 * Checks the chain, signs and broadcasts. The caller must have authenticated the user first
 * (architecture §5, forbidden rule 7). The pending record is saved as soon as the node accepts
 * the tx, before the caller navigates. If the broadcast times out, the node may still have it:
 * the record is saved too, flagged uncertain, and the status poller settles it (dropped if the
 * node never got it), so the user is not tempted to send twice.
 */
export async function sendTransaction(input: SendInput): Promise<SendOutcome> {
  const node = resolveActiveUrl(useNetworkStore.getState());
  try {
    input.onStage('checkingNetwork');
    const refused = await ensureCointMuNode(node);
    if (refused) return refused;
    const provider = getProvider();
    const nonce = await callRpc(() =>
      provider.getTransactionCount(input.draft.from.address, 'pending'),
    );

    input.onStage('signing');
    const signed = await sign(input, nonce);
    const { hash } = Transaction.from(signed);
    if (hash === null) throw new Error('Signed transaction has no hash');

    input.onStage('broadcasting');
    try {
      // Single attempt with a timeout: retrying a broadcast could send twice.
      await callRpc(() => provider.broadcastTransaction(signed), {
        retries: 0,
        timeoutMs: BROADCAST_TIMEOUT_MS,
      });
    } catch (error) {
      const code = classifySendError(error);
      if (code !== 'network') return { ok: false, error: code };
      saveRecord(input, { hash, nonce, node });
      return { ok: true, hash, isUncertain: true };
    }
    saveRecord(input, { hash, nonce, node });
    return { ok: true, hash, isUncertain: false };
  } catch (error) {
    logger.error('Sending failed', { error });
    return { ok: false, error: classifySendError(error) };
  }
}
