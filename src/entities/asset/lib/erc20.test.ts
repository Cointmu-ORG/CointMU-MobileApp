import { AbiCoder, encodeBytes32String } from 'ethers';

import { fetchTokenBalances, readTokenMetadata, type TokenReader } from '../api/token-api';
import { decodeTokenDecimals, decodeTokenText, encodeTransfer, ERC20 } from './erc20';

const coder = AbiCoder.defaultAbiCoder();
const TOKEN = '0x5FbDB2315678afecb367f032d93F642f64180aa3';
const OWNER = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
const MAX_LENGTH = 11;
const SIX = 6;

const asString = (text: string) => coder.encode(['string'], [text]);
const asUint = (value: bigint | number) => coder.encode(['uint256'], [value]);

describe('decodeTokenText', () => {
  it('decodes an ABI string', () => {
    expect(decodeTokenText(asString('CMUX'), MAX_LENGTH)).toBe('CMUX');
  });

  it('decodes a bytes32 symbol (MKR-style tokens)', () => {
    expect(decodeTokenText(encodeBytes32String('MKR'), MAX_LENGTH)).toBe('MKR');
  });

  it('strips control characters and caps the length', () => {
    expect(decodeTokenText(asString('AB\u0000C\nDEFGHIJKLMNOP'), MAX_LENGTH)).toBe('ABCDEFGHIJK');
  });

  it.each(['0x', '0x1234', asString('   ')])('gives null for %p', (raw) => {
    expect(decodeTokenText(raw, MAX_LENGTH)).toBeNull();
  });
});

describe('decodeTokenDecimals', () => {
  it('accepts the uint8 range', () => {
    expect(decodeTokenDecimals(asUint(SIX))).toBe(SIX);
  });

  it.each([asUint(256n), '0x', '0x01'])('rejects %p', (raw) => {
    expect(decodeTokenDecimals(raw)).toBeNull();
  });
});

describe('encodeTransfer', () => {
  it('encodes transfer(to, amount)', () => {
    const data = encodeTransfer(OWNER, 5n);
    expect(ERC20.decodeFunctionData('transfer', data).toArray()).toEqual([OWNER, 5n]);
  });
});

/** Mocked provider: answers eth_call by function selector. No real RPC. */
function mockToken(code: string, answers: Record<string, string | Error>): TokenReader {
  return {
    getCode: jest.fn(async () => code),
    call: jest.fn(async ({ data }: { data?: string | null }) => {
      const fn = ERC20.parseTransaction({ data: data ?? '0x' })?.name ?? '';
      const answer = answers[fn];
      if (answer instanceof Error) throw answer;
      return answer ?? '0x';
    }),
  } as unknown as TokenReader; // Only getCode and call are used.
}

describe('readTokenMetadata', () => {
  it('reads symbol, decimals and name of a standard token', async () => {
    const provider = mockToken('0x60', {
      symbol: asString('CMUX'),
      decimals: asUint(SIX),
      name: asString('CointMU Example'),
    });
    await expect(readTokenMetadata(provider, TOKEN)).resolves.toEqual({
      ok: true,
      token: {
        kind: 'erc20',
        address: TOKEN,
        symbol: 'CMUX',
        decimals: SIX,
        name: 'CointMU Example',
        source: 'custom',
      },
    });
  });

  it('accepts a bytes32 symbol and a missing name', async () => {
    const provider = mockToken('0x60', {
      symbol: encodeBytes32String('OLD'),
      decimals: asUint(SIX),
      name: new Error('execution reverted'),
    });
    await expect(readTokenMetadata(provider, TOKEN)).resolves.toMatchObject({
      ok: true,
      token: { symbol: 'OLD', name: null },
    });
  });

  it('rejects an address without code', async () => {
    await expect(readTokenMetadata(mockToken('0x', {}), TOKEN)).resolves.toEqual({
      ok: false,
      error: 'notContract',
    });
  });

  it('rejects a contract without symbol() or decimals()', async () => {
    const provider = mockToken('0x60', { symbol: asString('X') });
    await expect(readTokenMetadata(provider, TOKEN)).resolves.toEqual({
      ok: false,
      error: 'notToken',
    });
  });
});

describe('fetchTokenBalances', () => {
  it('returns null for a token that fails, without hiding the others', async () => {
    const good = mockToken('0x60', { balanceOf: asUint(7n) });
    const tokens = [
      { kind: 'erc20', address: TOKEN, symbol: 'A', decimals: 0, name: null, source: 'custom' },
    ] as const;
    await expect(fetchTokenBalances(good, OWNER, tokens)).resolves.toEqual([7n]);
    const bad = mockToken('0x60', { balanceOf: new Error('boom') });
    await expect(fetchTokenBalances(bad, OWNER, tokens)).resolves.toEqual([null]);
  });
});
