import { readWalletSecret, useWalletStore } from '@/entities/wallet';

import { importFromMnemonic, importFromPrivateKey } from './import-wallet';

const TEST_PHRASE = 'test test test test test test test test test test test junk';
const TEST_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const TEST_ADDRESS = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

beforeEach(() => useWalletStore.getState().reset());

describe('import-wallet', () => {
  it('imports a pasted mnemonic and goes to PIN setup', async () => {
    await expect(importFromMnemonic(`  ${TEST_PHRASE.toUpperCase()}\n`)).resolves.toEqual({
      ok: true,
    });
    expect(useWalletStore.getState()).toMatchObject({
      status: 'pendingPin',
      address: TEST_ADDRESS,
      source: 'mnemonic',
    });
    await expect(readWalletSecret()).resolves.toEqual({ kind: 'mnemonic', phrase: TEST_PHRASE });
  });

  it('imports a private key without a mnemonic', async () => {
    await expect(importFromPrivateKey(TEST_KEY.slice(2))).resolves.toEqual({ ok: true });
    expect(useWalletStore.getState()).toMatchObject({
      status: 'pendingPin',
      source: 'private-key',
    });
    await expect(readWalletSecret()).resolves.toEqual({
      kind: 'private-key',
      privateKey: TEST_KEY,
    });
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
    await expect(readWalletSecret()).resolves.toBeNull();
    expect(useWalletStore.getState().status).toBe('none');
  });
});
