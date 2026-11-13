import type { Asset } from '@/entities/asset';
import { getProvider } from '@/entities/network';
import { buildFeeQuote, type FeeQuote } from '@/entities/transaction';
import { callRpc } from '@/shared/api';
import { isSameAddress } from '@/shared/lib';

import { buildTxRequest, maxSendable } from '../lib/send-math';
import type { SendDraft, SendSource } from './send-flow-store';

type QuoteInput = {
  readonly asset: Asset;
  readonly from: string;
  readonly to: string;
  readonly amount: bigint;
};

const EMPTY_CODE = '0x';

/**
 * estimateGas (throws early, e.g. a reverting token transfer) and getFeeData, combined into a
 * fee quote with the mode detected at runtime (D-22). Errors go through classifySendError.
 */
export async function quoteSend(input: QuoteInput): Promise<FeeQuote> {
  const provider = getProvider();
  const request = buildTxRequest(input);
  const [gasLimit, feeData] = await Promise.all([
    callRpc(() => provider.estimateGas(request)),
    callRpc(() => provider.getFeeData()),
  ]);
  return buildFeeQuote(feeData, gasLimit, Date.now());
}

/** Warnings for the review screen. They inform; they never block the send. */
export async function checkRecipient(from: string, to: string) {
  const code = await callRpc(() => getProvider().getCode(to));
  return { isSelfSend: isSameAddress(from, to), isContractRecipient: code !== EMPTY_CODE };
}

/** Quote and recipient checks together: everything the review screen needs. */
export async function prepareDraft(
  input: Omit<QuoteInput, 'from'> & { readonly from: SendSource },
): Promise<SendDraft> {
  const { asset, from, to, amount } = input;
  const [quote, recipient] = await Promise.all([
    quoteSend({ asset, from: from.address, to, amount }),
    checkRecipient(from.address, to),
  ]);
  return { from, asset, to, amount, quote, ...recipient };
}

/** "Max" for the form. Native CMU needs a fee quote first; a token does not. */
export async function computeMax(input: {
  readonly asset: Asset;
  readonly from: string;
  readonly to: string | null;
  readonly nativeBalance: bigint;
  readonly tokenBalance: bigint | null;
}): Promise<bigint> {
  const { asset, from, nativeBalance, tokenBalance } = input;
  const quote =
    asset.kind === 'native'
      ? await quoteSend({ asset, from, to: input.to ?? from, amount: 0n })
      : null;
  return maxSendable({ asset, maxFee: quote?.maxFee ?? 0n, nativeBalance, tokenBalance });
}
