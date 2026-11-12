import { createWalletId, MAX_WALLETS, readWalletSecret, useWalletStore } from '@/entities/wallet';

import { importFromMnemonic, importFromPrivateKey } from './import-wallet';

// Public Hardhat test accounts; never hold real funds.
const TEST_PHRASE = 'test test test test test test test test test test test junk';
const TEST_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const TEST_ADDRESS = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
const OTHER_KEY = '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d';
const OTHER_ADDRESS = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';

const state = () => useWalletStore.getState();
const activeSecret = () => readWalletSecret(state().activeWalletId ?? '');

/** Imports the first wallet and finishes onboarding. */
async function importFirstWallet(key = TEST_KEY) {
  const result = await importFromPrivateKey(key);
  state().activate();
  if (!result.ok) throw new Error('fixture import failed');
  return result.walletId;
}

beforeEach(() => state().reset());

describe('importing the first wallet', () => {
  it('imports a pasted mnemonic and goes to PIN setup', async () => {
    const result = await importFromMnemonic(`  ${TEST_PHRASE.toUpperCase()}\n`);
    expect(result).toEqual({ ok: true, walletId: state().activeWalletId });
    expect(state()).toMatchObject({
      status: 'pendingPin',
      address: TEST_ADDRESS,
      source: 'mnemonic',
    });
    await expect(activeSecret()).resolves.toEqual({ kind: 'mnemonic', phrase: TEST_PHRASE });
  });

  it('imports a private key without a mnemonic', async () => {
    await expect(importFromPrivateKey(TEST_KEY.slice(2))).resolves.toMatchObject({ ok: true });
    expect(state()).toMatchObject({ status: 'pendingPin', source: 'private-key' });
    await expect(activeSecret()).resolves.toEqual({ kind: 'private-key', privateKey: TEST_KEY });
  });

  it('rejects invalid input without storing anything', async () => {
    await expect(importFromMnemonic('not a phrase')).resolves.toEqual({
      ok: false,
      error: 'invalidMnemonic',
    });
    await expect(importFromPrivateKey('0x12')).resolves.toEqual({
      ok: false,
      error: 'invalidPrivateKey',
    });
    expect(state()).toMatchObject({ status: 'none', wallets: [] });
  });
});

describe('importing another wallet', () => {
  it('adds it next to the first under its own key and makes it active', async () => {
    const firstId = await importFirstWallet();
    const result = await importFromPrivateKey(OTHER_KEY);

    expect(result).toMatchObject({ ok: true });
    expect(state().wallets).toHaveLength(2);
    expect(state()).toMatchObject({ status: 'active', address: OTHER_ADDRESS });
    expect(state().activeWalletId).not.toBe(firstId);
    await expect(readWalletSecret(firstId)).resolves.toEqual({
      kind: 'private-key',
      privateKey: TEST_KEY,
    });
    await expect(activeSecret()).resolves.toEqual({ kind: 'private-key', privateKey: OTHER_KEY });
  });

  it('refuses a key that is already here', async () => {
    await importFirstWallet();
    await expect(importFromPrivateKey(TEST_KEY)).resolves.toEqual({
      ok: false,
      error: 'duplicate',
    });
    expect(state().wallets).toHaveLength(1);
  });

  it('refuses a phrase whose first address is already here, whatever it came from', async () => {
    // The Hardhat key is account 0 of the Hardhat phrase: the same first address.
    await importFirstWallet();
    await expect(importFromMnemonic(TEST_PHRASE)).resolves.toEqual({
      ok: false,
      error: 'duplicate',
    });
    expect(state().wallets).toHaveLength(1);
  });

  it('refuses a key that is an added account of a phrase wallet', async () => {
    await importFromMnemonic(TEST_PHRASE);
    state().activate();
    state().addAccount(state().activeWalletId ?? '', { index: 1, address: OTHER_ADDRESS });
    await expect(importFromPrivateKey(OTHER_KEY)).resolves.toEqual({
      ok: false,
      error: 'duplicate',
    });
  });

  it(`refuses a wallet past the limit of ${MAX_WALLETS}`, async () => {
    await importFirstWallet();
    for (let count = 1; count < MAX_WALLETS; count += 1) {
      state().addWallet({
        id: createWalletId(),
        source: 'private-key',
        origin: 'imported',
        address: `0x${count.toString(16).padStart(40, '0')}`,
        addedAt: 0,
      });
    }
    await expect(importFromPrivateKey(OTHER_KEY)).resolves.toEqual({
      ok: false,
      error: 'limitReached',
    });
    expect(state().wallets).toHaveLength(MAX_WALLETS);
  });
});

describe('restoring one unreadable wallet', () => {
  it('puts the secret back under the same wallet id and clears the flag', async () => {
    const firstId = await importFirstWallet();
    await importFromPrivateKey(OTHER_KEY);
    state().setUnreadableWallets([firstId]);

    const result = await importFromPrivateKey(TEST_KEY, { kind: 'recover', walletId: firstId });

    expect(result).toEqual({ ok: true, walletId: firstId });
    expect(state().wallets).toHaveLength(2);
    expect(state().wallets.every((wallet) => !wallet.needsRecovery)).toBe(true);
    await expect(readWalletSecret(firstId)).resolves.toEqual({
      kind: 'private-key',
      privateKey: TEST_KEY,
    });
  });

  it("refuses another wallet's secret, and the right address from the wrong kind", async () => {
    const firstId = await importFirstWallet();
    const target = { kind: 'recover', walletId: firstId } as const;
    state().setUnreadableWallets([firstId]);

    await expect(importFromPrivateKey(OTHER_KEY, target)).resolves.toEqual({
      ok: false,
      error: 'wrongWallet',
    });
    // Same first address, but a phrase is not this private-key wallet's secret.
    await expect(importFromMnemonic(TEST_PHRASE, target)).resolves.toEqual({
      ok: false,
      error: 'wrongWallet',
    });
    expect(state().wallets[0]?.needsRecovery).toBe(true);
  });
});
