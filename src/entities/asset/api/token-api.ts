import { isError, type JsonRpcProvider } from 'ethers';

import { callRpc } from '@/shared/api';
import { mapWithLimit } from '@/shared/lib';

import {
  MAX_TOKEN_NAME_LENGTH,
  MAX_TOKEN_SYMBOL_LENGTH,
  TOKEN_BALANCE_CONCURRENCY,
} from '../config/registry';
import { decodeTokenDecimals, decodeTokenText, ERC20 } from '../lib/erc20';
import type { Erc20Asset } from '../model/types';

export type TokenReader = Pick<JsonRpcProvider, 'getCode' | 'call'>;

export type TokenMetadataResult =
  | { readonly ok: true; readonly token: Erc20Asset }
  | { readonly ok: false; readonly error: 'notContract' | 'notToken' };

const EMPTY_CODE = '0x';

/** True when callRpc failed because the contract reverted, not because the node was unreachable. */
function isRevert(error: unknown): boolean {
  const cause = error instanceof Error ? error.cause : undefined;
  return (
    isError(cause, 'CALL_EXCEPTION') || (cause instanceof Error && /revert/i.test(cause.message))
  );
}

/**
 * eth_call that returns '0x' when the contract has no such function (it reverts). Not retried:
 * a revert is an answer. Unreachable nodes still throw.
 */
async function readOptional(provider: TokenReader, to: string, fn: string): Promise<string> {
  try {
    return await callRpc(() => provider.call({ to, data: ERC20.encodeFunctionData(fn) }), {
      retries: 0,
    });
  } catch (error) {
    if (isRevert(error)) return EMPTY_CODE;
    throw error;
  }
}

/**
 * Reads a custom token's metadata: the address must hold code, and symbol() and decimals() must
 * decode. name() is optional. Network failures throw (RpcUnavailableError) so the UI can tell
 * "unreachable" from "not a token".
 */
export async function readTokenMetadata(
  provider: TokenReader,
  address: string,
): Promise<TokenMetadataResult> {
  const code = await callRpc(() => provider.getCode(address));
  if (code === EMPTY_CODE) return { ok: false, error: 'notContract' };

  const [symbolRaw, decimalsRaw, nameRaw] = await Promise.all([
    readOptional(provider, address, 'symbol'),
    readOptional(provider, address, 'decimals'),
    readOptional(provider, address, 'name'),
  ]);
  const symbol = decodeTokenText(symbolRaw, MAX_TOKEN_SYMBOL_LENGTH);
  const decimals = decodeTokenDecimals(decimalsRaw);
  if (symbol === null || decimals === null) return { ok: false, error: 'notToken' };
  const name = decodeTokenText(nameRaw, MAX_TOKEN_NAME_LENGTH);
  return { ok: true, token: { kind: 'erc20', address, symbol, decimals, name, source: 'custom' } };
}

/** balanceOf for each token, a few calls at a time. A failed token gives null, not a throw. */
export async function fetchTokenBalances(
  provider: TokenReader,
  owner: string,
  tokens: readonly Erc20Asset[],
): Promise<(bigint | null)[]> {
  return mapWithLimit(tokens, TOKEN_BALANCE_CONCURRENCY, async (token) => {
    try {
      const data = ERC20.encodeFunctionData('balanceOf', [owner]);
      const result = await callRpc(() => provider.call({ to: token.address, data }));
      return BigInt(ERC20.decodeFunctionResult('balanceOf', result)[0]);
    } catch {
      // One unreadable token must not hide the others; the row shows its balance as missing.
      return null;
    }
  });
}
