import { deriveAccount } from './derive';
import { generateMnemonic, isValidMnemonic, normalizePhrase, splitWords } from './mnemonic';
import { addressFromPrivateKey, normalizePrivateKey } from './private-key';

// Well-known public test vector (Hardhat/Anvil default account). Never holds real funds.
const TEST_PHRASE = 'test test test test test test test test test test test junk';
const TEST_ADDRESS_0 = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
const TEST_ADDRESS_1 = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
const TEST_KEY_0 = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const CURVE_ORDER_HEX = 'fffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141';

describe('deriveAccount', () => {
  it('derives the BIP-44 index 0 address', async () => {
    await expect(deriveAccount(TEST_PHRASE)).resolves.toEqual({
      address: TEST_ADDRESS_0,
      accountIndex: 0,
    });
  });

  it('derives other indexes on the same path', async () => {
    await expect(deriveAccount(TEST_PHRASE, 1)).resolves.toEqual({
      address: TEST_ADDRESS_1,
      accountIndex: 1,
    });
  });
});

describe('mnemonic', () => {
  it('generates a valid 12-word phrase', () => {
    const phrase = generateMnemonic();
    expect(splitWords(phrase)).toHaveLength(12);
    expect(isValidMnemonic(phrase)).toBe(true);
  });

  it('normalizes pasted input', () => {
    expect(normalizePhrase('  Test  TEST\ntest ')).toBe('test test test');
  });

  it('rejects a bad checksum and wrong word counts', () => {
    expect(isValidMnemonic(TEST_PHRASE.replace('junk', 'test'))).toBe(false);
    expect(isValidMnemonic('test test test')).toBe(false);
  });
});

describe('private key', () => {
  it('accepts keys with or without 0x and derives the address', () => {
    const key = normalizePrivateKey(TEST_KEY_0.slice(2).toUpperCase());
    expect(key).toBe(TEST_KEY_0);
    expect(addressFromPrivateKey(TEST_KEY_0)).toBe(TEST_ADDRESS_0);
  });

  it('rejects malformed, zero and out-of-range keys', () => {
    expect(normalizePrivateKey('0x1234')).toBeNull();
    expect(normalizePrivateKey(`0x${'0'.repeat(64)}`)).toBeNull();
    expect(normalizePrivateKey(CURVE_ORDER_HEX)).toBeNull();
  });
});
