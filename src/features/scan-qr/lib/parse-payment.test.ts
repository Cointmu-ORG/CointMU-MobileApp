import { parseEip681Number, parsePaymentQr } from './parse-payment';

const CHAIN = 1912;
const ADDR = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
const TOKEN = '0x5FbDB2315678afecb367f032d93F642f64180aa3';
const BAD_CHECKSUM = ADDR.replace('C51', 'c51');
const ONE = 10n ** 18n;
// Public test vectors only: the Hardhat key #0 and the BIP-39 "abandon" phrase.
const KEY = 'ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const PHRASE12 =
  'abandon ability able about above absent absorb abstract absurd abuse access accident';
const PHRASE24 = `${PHRASE12} ${PHRASE12}`;

describe('parsePaymentQr: accepted', () => {
  it.each([
    ['plain address', ADDR, { to: ADDR, token: null, amount: null }],
    ['plain lowercase', ADDR.toLowerCase(), { to: ADDR, token: null, amount: null }],
    ['EIP-681 address only', `ethereum:${ADDR}`, { to: ADDR, token: null, amount: null }],
    ['EIP-681 pay- prefix', `ethereum:pay-${ADDR}`, { to: ADDR, token: null, amount: null }],
    ['EIP-681 our chain', `ethereum:${ADDR}@1912`, { to: ADDR, token: null, amount: null }],
    [
      'EIP-681 value',
      `ethereum:${ADDR}@1912?value=1500000000000000000`,
      { to: ADDR, token: null, amount: (3n * ONE) / 2n },
    ],
    [
      'EIP-681 value exponent',
      `ethereum:${ADDR}?value=2.014e18`,
      { to: ADDR, token: null, amount: 2_014n * 10n ** 15n },
    ],
    ['EIP-681 scheme case', `ETHEREUM:${ADDR}`, { to: ADDR, token: null, amount: null }],
    [
      'ERC-20 transfer',
      `ethereum:${TOKEN}@1912/transfer?address=${ADDR}&uint256=1e6`,
      { to: ADDR, token: TOKEN, amount: 1_000_000n },
    ],
    [
      'ERC-20 transfer without amount',
      `ethereum:${TOKEN.toLowerCase()}/transfer?address=${ADDR.toLowerCase()}`,
      { to: ADDR, token: TOKEN, amount: null },
    ],
  ])('%s', (_name, input, request) => {
    expect(parsePaymentQr(input, CHAIN)).toEqual({ ok: true, request });
  });
});

describe('parsePaymentQr: refused', () => {
  it.each([
    ['private key', KEY, 'secret'],
    ['private key with 0x', `0x${KEY}`, 'secret'],
    ['12-word phrase', PHRASE12, 'secret'],
    ['24-word phrase', PHRASE24, 'secret'],
    [
      'phrase with odd spacing and case',
      `  ${PHRASE12.toUpperCase().replace(/ /g, '   ')} `,
      'secret',
    ],
    ['other chain', `ethereum:${ADDR}@1?value=1`, 'wrongChain'],
    ['other chain on a token', `ethereum:${TOKEN}@56/transfer?address=${ADDR}`, 'wrongChain'],
    ['bad checksum', BAD_CHECKSUM, 'badChecksum'],
    ['bad checksum in URI', `ethereum:${BAD_CHECKSUM}`, 'badChecksum'],
    ['bad checksum recipient', `ethereum:${TOKEN}/transfer?address=${BAD_CHECKSUM}`, 'badChecksum'],
    ['ENS name', 'ethereum:alice.eth', 'invalidAddress'],
    ['transfer without recipient', `ethereum:${TOKEN}/transfer?uint256=1`, 'invalidAddress'],
    ['negative value', `ethereum:${ADDR}?value=-1`, 'invalidAmount'],
    ['fractional wei', `ethereum:${ADDR}?value=1.5`, 'invalidAmount'],
    ['other function', `ethereum:${TOKEN}/approve?address=${ADDR}&uint256=1`, 'unsupported'],
    ['web link', 'https://example.invalid/pay', 'unsupported'],
    ['eleven words', PHRASE12.split(' ').slice(1).join(' '), 'unsupported'],
    ['empty', '', 'unsupported'],
  ])('%s', (_name, input, error) => {
    expect(parsePaymentQr(input, CHAIN)).toEqual({ ok: false, error });
  });
});

describe('parseEip681Number', () => {
  it.each([
    ['0', 0n],
    ['42', 42n],
    ['1e3', 1_000n],
    ['2.5e1', 25n],
    ['1.50e1', 15n],
  ])('%s → %s', (input, expected) => {
    expect(parseEip681Number(input)).toBe(expected);
  });

  it.each(['1.5', '1e', 'e5', '-1', '0x10', ''])('rejects %p', (input) => {
    expect(parseEip681Number(input)).toBeNull();
  });
});
