import { secureStorage } from '@/shared/lib';

import { LEGACY_WALLET_ID } from '../config/wallet-config';
import {
  createWalletId,
  deleteAllWalletSecrets,
  deleteWalletSecret,
  hasReadableWalletSecret,
  readWalletSecret,
  saveWalletSecret,
  type WalletSecret,
} from './wallet-secret';

const PHRASE: WalletSecret = {
  kind: 'mnemonic',
  phrase: 'test test test test test test test test test test test junk',
};
// Public Hardhat test key; never holds real funds.
const KEY: WalletSecret = {
  kind: 'private-key',
  privateKey: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
};
const INDEX_KEY = 'muvo.wallet.ids';
const LEGACY_KEY = 'muvo.wallet.secret';

const readIndex = async () => JSON.parse((await secureStorage.get(INDEX_KEY)) ?? '[]') as string[];

describe('wallet ids', () => {
  it('are random 32-character lowercase hex strings', () => {
    const ids = new Set(Array.from({ length: 20 }, createWalletId));
    expect(ids.size).toBe(20);
    for (const id of ids) expect(id).toMatch(/^[0-9a-f]{32}$/);
  });
});

describe('per-wallet secrets', () => {
  it('keeps each wallet secret under its own key and returns the right one by id', async () => {
    const first = createWalletId();
    const second = createWalletId();
    await saveWalletSecret(first, PHRASE);
    await saveWalletSecret(second, KEY);

    await expect(readWalletSecret(first)).resolves.toEqual(PHRASE);
    await expect(readWalletSecret(second)).resolves.toEqual(KEY);
    await expect(secureStorage.get(`muvo.wallet.secret.${first}`)).resolves.not.toBeNull();
    await expect(readIndex()).resolves.toEqual([first, second]);
  });

  it('indexes concurrent saves without losing an id', async () => {
    const ids = Array.from({ length: 5 }, createWalletId);
    await Promise.all(ids.map((id) => saveWalletSecret(id, KEY)));
    await expect(readIndex()).resolves.toEqual(expect.arrayContaining(ids));
    expect(await readIndex()).toHaveLength(ids.length);
  });

  it('reads the pre-multi-wallet secret from its original key, without indexing it', async () => {
    await secureStorage.set(LEGACY_KEY, JSON.stringify(PHRASE));
    await expect(readWalletSecret(LEGACY_WALLET_ID)).resolves.toEqual(PHRASE);
    await expect(secureStorage.get(INDEX_KEY)).resolves.toBeNull();
  });

  it('refuses an id that is not a wallet id, so a key name can never be forged', async () => {
    await expect(saveWalletSecret('../muvo.auth.pin', KEY)).rejects.toThrow('Malformed wallet id');
    await expect(readWalletSecret('auth.pin')).rejects.toThrow('Malformed wallet id');
    await expect(hasReadableWalletSecret('auth.pin')).resolves.toBe(false);
  });

  it('treats a missing or malformed secret as unreadable', async () => {
    const id = createWalletId();
    await expect(hasReadableWalletSecret(id)).resolves.toBe(false);
    await secureStorage.set(`muvo.wallet.secret.${id}`, '{not json');
    await expect(hasReadableWalletSecret(id)).resolves.toBe(false);
    await secureStorage.set(`muvo.wallet.secret.${id}`, JSON.stringify({ kind: 'other' }));
    await expect(hasReadableWalletSecret(id)).resolves.toBe(false);
  });

  it('deletes one wallet and leaves the others', async () => {
    const first = createWalletId();
    const second = createWalletId();
    await saveWalletSecret(first, PHRASE);
    await saveWalletSecret(second, KEY);

    await deleteWalletSecret(first);

    await expect(readWalletSecret(first)).resolves.toBeNull();
    await expect(readWalletSecret(second)).resolves.toEqual(KEY);
    await expect(readIndex()).resolves.toEqual([second]);
  });
});

describe('deleteAllWalletSecrets', () => {
  it('wipes the legacy key, every indexed wallet and the index', async () => {
    const ids = [createWalletId(), createWalletId()];
    await secureStorage.set(LEGACY_KEY, JSON.stringify(PHRASE));
    for (const id of ids) await saveWalletSecret(id, KEY);

    await deleteAllWalletSecrets();

    await expect(readWalletSecret(LEGACY_WALLET_ID)).resolves.toBeNull();
    for (const id of ids) await expect(readWalletSecret(id)).resolves.toBeNull();
    await expect(secureStorage.get(INDEX_KEY)).resolves.toBeNull();
  });

  it('also wipes wallets the caller knows about when the index is damaged', async () => {
    const id = createWalletId();
    await saveWalletSecret(id, KEY);
    await secureStorage.set(INDEX_KEY, '{broken');

    await deleteAllWalletSecrets([id, 'not-an-id']);

    await expect(readWalletSecret(id)).resolves.toBeNull();
  });
});
