import { looksLikeSecret } from '@/entities/wallet';
import { checkAddress } from '@/shared/lib';

export type PaymentRequest = {
  readonly to: string;
  /** Checksummed token contract for an ERC-20 request; null for native CMU. */
  readonly token: string | null;
  /** Base units (wei for CMU), or null when the request names no amount. */
  readonly amount: bigint | null;
};

export type ScanError =
  'secret' | 'wrongChain' | 'badChecksum' | 'invalidAddress' | 'invalidAmount' | 'unsupported';

export type ScanResult =
  | { readonly ok: true; readonly request: PaymentRequest }
  | { readonly ok: false; readonly error: ScanError };

// ethereum:[pay-]<address>[@<chainId>][/<function>][?<query>] (EIP-681). ENS names unsupported.
const EIP681 = /^ethereum:(?:pay-)?([^@/?]+)(?:@(\d+))?(?:\/([^?]+))?(?:\?(.*))?$/i;
// EIP-681 numbers may use a decimal point and an exponent: 2.014e18.
const EIP681_NUMBER = /^(\d+)(?:\.(\d+))?(?:[eE](\d+))?$/;
const TEN = 10n;

const fail = (error: ScanError): ScanResult => ({ ok: false, error });

/** An EIP-681 number as an exact integer, or null if it is not a whole number of base units. */
export function parseEip681Number(text: string): bigint | null {
  const match = EIP681_NUMBER.exec(text);
  if (!match) return null;
  const [, whole = '', fraction = '', exponentText = '0'] = match;
  const shift = Number(exponentText) - fraction.length;
  const digits = BigInt(`${whole}${fraction}`);
  if (shift >= 0) return digits * TEN ** BigInt(shift);
  const divisor = TEN ** BigInt(-shift);
  return digits % divisor === 0n ? digits / divisor : null;
}

/**
 * Query parameters as a map. React Native's URLSearchParams is incomplete (no get() in some
 * versions), so this splits by hand. A malformed escape drops that parameter.
 */
function parseQuery(query: string): ReadonlyMap<string, string> {
  const params = new Map<string, string>();
  for (const pair of query.split('&')) {
    const [key = '', raw = ''] = pair.split('=');
    try {
      if (key !== '') params.set(decodeURIComponent(key), decodeURIComponent(raw));
    } catch {
      // URIError from a broken %-escape: ignore the parameter; a missing value is checked later.
    }
  }
  return params;
}

function readAmount(raw: string | undefined): bigint | null | 'invalid' {
  if (raw === undefined) return null;
  return parseEip681Number(raw) ?? 'invalid';
}

function buildRequest(
  target: string,
  fn: string | undefined,
  query: ReadonlyMap<string, string>,
): ScanResult {
  if (fn === undefined) {
    const amount = readAmount(query.get('value'));
    return amount === 'invalid'
      ? fail('invalidAmount')
      : { ok: true, request: { to: target, token: null, amount } };
  }
  if (fn.toLowerCase() !== 'transfer') return fail('unsupported');
  const to = checkAddress(query.get('address') ?? '');
  if (!to.ok) return fail(to.error === 'badChecksum' ? 'badChecksum' : 'invalidAddress');
  const amount = readAmount(query.get('uint256'));
  return amount === 'invalid'
    ? fail('invalidAmount')
    : { ok: true, request: { to: to.address, token: target, amount } };
}

/**
 * Parses a scanned QR code: a plain address, an EIP-681 native payment
 * (`ethereum:<addr>[@<chainId>][?value=<wei>]`) or an ERC-20 transfer
 * (`ethereum:<token>[@<chainId>]/transfer?address=<to>&uint256=<amount>`). A chain ID other
 * than ours is refused. Anything that looks like a recovery phrase or private key is refused
 * before any other parsing; the caller must not log or keep it.
 */
export function parsePaymentQr(text: string, chainId: number): ScanResult {
  const value = text.trim();
  if (looksLikeSecret(value)) return fail('secret');
  const match = EIP681.exec(value);
  if (!match) {
    const plain = checkAddress(value);
    if (plain.ok) return { ok: true, request: { to: plain.address, token: null, amount: null } };
    return fail(plain.error === 'badChecksum' ? 'badChecksum' : 'unsupported');
  }
  const [, rawTarget = '', rawChainId, fn, rawQuery = ''] = match;
  if (rawChainId !== undefined && Number(rawChainId) !== chainId) return fail('wrongChain');
  const target = checkAddress(rawTarget);
  if (!target.ok) return fail(target.error === 'badChecksum' ? 'badChecksum' : 'invalidAddress');
  return buildRequest(target.address, fn, parseQuery(rawQuery));
}
