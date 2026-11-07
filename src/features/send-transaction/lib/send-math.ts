import { encodeTransfer, type Asset } from '@/entities/asset';

/** The call to estimate and sign: a plain value transfer, or transfer(to, amount) on a token. */
export function buildTxRequest(input: {
  readonly asset: Asset;
  readonly from: string;
  readonly to: string;
  readonly amount: bigint;
}) {
  const { asset, from, to, amount } = input;
  return asset.kind === 'native'
    ? { from, to, value: amount, data: '0x' }
    : { from, to: asset.address, value: 0n, data: encodeTransfer(to, amount) };
}

export type FundsCheck = 'ok' | 'insufficientFunds' | 'insufficientGas';

/**
 * The balance check on the review screen includes the fee. A token send pays its fee in CMU,
 * so the CMU balance must cover the fee on its own (insufficientGas).
 */
export function checkFunds(input: {
  readonly asset: Asset;
  readonly amount: bigint;
  readonly maxFee: bigint;
  readonly nativeBalance: bigint;
  readonly tokenBalance: bigint | null;
}): FundsCheck {
  const { asset, amount, maxFee, nativeBalance, tokenBalance } = input;
  if (asset.kind === 'native') {
    return amount + maxFee > nativeBalance ? 'insufficientFunds' : 'ok';
  }
  if (tokenBalance === null || amount > tokenBalance) return 'insufficientFunds';
  return maxFee > nativeBalance ? 'insufficientGas' : 'ok';
}

/** "Max": native CMU is the balance minus the fee; a token is its whole balance. */
export function maxSendable(input: {
  readonly asset: Asset;
  readonly maxFee: bigint;
  readonly nativeBalance: bigint;
  readonly tokenBalance: bigint | null;
}): bigint {
  const { asset, maxFee, nativeBalance, tokenBalance } = input;
  if (asset.kind === 'erc20') return tokenBalance ?? 0n;
  return nativeBalance > maxFee ? nativeBalance - maxFee : 0n;
}
