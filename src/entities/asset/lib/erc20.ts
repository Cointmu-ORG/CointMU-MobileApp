import { AbiCoder, decodeBytes32String, Interface } from 'ethers';

import { MAX_TOKEN_DECIMALS } from '../config/registry';

/** Minimal ERC-20 ABI (architecture §7). */
export const ERC20 = new Interface([
  'function balanceOf(address owner) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
]);

export const TRANSFER_TOPIC = ERC20.getEvent('Transfer')?.topicHash ?? '';

const BYTES32_HEX_LENGTH = 66;
// Control characters and the like never belong in a symbol or name shown to the user.
const UNPRINTABLE = /[\p{C}]/gu;

function clean(text: string, maxLength: number): string | null {
  const value = text.replace(UNPRINTABLE, '').trim().slice(0, maxLength);
  return value === '' ? null : value;
}

/**
 * Decodes a symbol() or name() result. Standard tokens return an ABI string; some old tokens
 * (MKR-style) return bytes32. Anything else, or an empty value, gives null.
 */
export function decodeTokenText(result: string, maxLength: number): string | null {
  if (result === '0x') return null;
  try {
    const [text] = AbiCoder.defaultAbiCoder().decode(['string'], result);
    return clean(String(text), maxLength);
  } catch {
    // Not an ABI string: try bytes32 below.
  }
  if (result.length !== BYTES32_HEX_LENGTH) return null;
  try {
    return clean(decodeBytes32String(result), maxLength);
  } catch {
    return null;
  }
}

/** Decodes decimals(); null unless it is a whole number in the uint8 range. */
export function decodeTokenDecimals(result: string): number | null {
  try {
    const [value] = AbiCoder.defaultAbiCoder().decode(['uint256'], result);
    const decimals = BigInt(value);
    return decimals <= BigInt(MAX_TOKEN_DECIMALS) ? Number(decimals) : null;
  } catch {
    return null;
  }
}

/** Call data for transfer(to, amount). */
export function encodeTransfer(to: string, amount: bigint): string {
  return ERC20.encodeFunctionData('transfer', [to, amount]);
}
