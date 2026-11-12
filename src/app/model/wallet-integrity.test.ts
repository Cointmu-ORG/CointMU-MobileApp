import { pinHasher, readPinRecord, writePinRecord } from '@/entities/auth';
import { deleteWalletSecret, readWalletSecret, useWalletStore } from '@/entities/wallet';
import { secureStorage } from '@/shared/lib';

import { addWallet, seedWallet, seedWalletRecord } from '../../../jest.seed-wallet';
import { assessWalletData, recoverIfWalletDataMissing } from './wallet-integrity';

const PHRASE = 'test test test test test test test test test test test junk';
const SECRET = { kind: 'mnemonic', phrase: PHRASE } as const;
const KEY_SECRET = {
  kind: 'private-key',
  privateKey: '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d',
} as const;
const ADDRESS = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
const OTHER = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';

const state = () => useWalletStore.getState();

describe('assessWalletData', () => {
  const ids = ['a', 'b'];

  it.each([
    ['none', true, [], 'ok'],
    ['none', false, ['a', 'b'], 'ok'],
    ['pendingBackup', false, [], 'ok'],
    ['pendingBackup', false, ['a', 'b'], 'wipe'],
    ['pendingPin', false, [], 'ok'],
    ['pendingPin', false, ['a', 'b'], 'wipe'],
    ['active', true, [], 'ok'],
    ['active', false, [], 'wipe'],
    ['active', true, ['a', 'b'], 'wipe'],
    ['active', true, ['b'], 'partial'],
    ['active', false, ['b'], 'wipe'],
  ] as const)('%s (pin: %s, unreadable: %j) → %s', (status, hasPinRecord, unreadableIds, kind) => {
    const verdict = assessWalletData({ status, hasPinRecord, walletIds: ids, unreadableIds });
    expect(verdict.kind).toBe(kind);
  });

  it('names the unreadable wallets of a partial verdict', () => {
    expect(
      assessWalletData({
        status: 'active',
        hasPinRecord: true,
        walletIds: ids,
        unreadableIds: ['b'],
      }),
    ).toEqual({ kind: 'partial', unreadableIds: ['b'] });
  });
});

async function seedActiveWallet() {
  const id = await seedWallet({ secret: SECRET, address: ADDRESS });
  await writePinRecord(await pinHasher.hash('123456'));
  state().activate();
  return id;
}

beforeEach(() => state().reset());

describe('recoverIfWalletDataMissing with one wallet', () => {
  it('leaves a healthy wallet untouched', async () => {
    const id = await seedActiveWallet();
    await expect(recoverIfWalletDataMissing()).resolves.toBe(false);
    expect(state()).toMatchObject({ status: 'active', isRecoveryRequired: false });
    await expect(readWalletSecret(id)).resolves.not.toBeNull();
  });

  it('wipes and flags recovery when the PIN record is gone', async () => {
    const id = await seedActiveWallet();
    await secureStorage.remove('muvo.auth.pin');
    await expect(recoverIfWalletDataMissing()).resolves.toBe(true);
    expect(state()).toMatchObject({ status: 'none', address: null, isRecoveryRequired: true });
    await expect(readWalletSecret(id)).resolves.toBeNull();
  });

  it('treats an unreadable secret as missing', async () => {
    const id = await seedActiveWallet();
    await secureStorage.set(`muvo.wallet.secret.${id}`, '{not json');
    await expect(recoverIfWalletDataMissing()).resolves.toBe(true);
    await expect(readPinRecord()).resolves.toBeNull();
  });

  it('accepts pendingBackup without a PIN record', async () => {
    await seedWallet({ secret: SECRET, address: ADDRESS, origin: 'created' });
    await expect(recoverIfWalletDataMissing()).resolves.toBe(false);
    expect(state().status).toBe('pendingBackup');
  });

  it('flags recovery when pendingBackup lost its secret', async () => {
    seedWalletRecord({ source: 'mnemonic', address: ADDRESS, origin: 'created' });
    await expect(recoverIfWalletDataMissing()).resolves.toBe(true);
    expect(state().isRecoveryRequired).toBe(true);
  });

  it('does nothing when the wallet store could not be loaded', async () => {
    const id = await seedActiveWallet();
    await deleteWalletSecret(id);
    useWalletStore.setState({ hasHydrationFailed: true });
    await expect(recoverIfWalletDataMissing()).resolves.toBe(false);
    await expect(readPinRecord()).resolves.not.toBeNull();
    useWalletStore.setState({ hasHydrationFailed: false });
  });
});

describe('recoverIfWalletDataMissing with several wallets', () => {
  async function seedTwo() {
    const firstId = await seedActiveWallet();
    const secondId = await addWallet({ secret: KEY_SECRET, address: OTHER });
    return { firstId, secondId };
  }

  it('flags only the unreadable wallet; the other keeps working and stays active', async () => {
    const { firstId, secondId } = await seedTwo();
    expect(state().activeWalletId).toBe(secondId);
    await deleteWalletSecret(secondId);

    await expect(recoverIfWalletDataMissing()).resolves.toBe(false);

    expect(state()).toMatchObject({
      status: 'active',
      isRecoveryRequired: false,
      activeWalletId: firstId,
      address: ADDRESS,
    });
    expect(state().wallets.map((wallet) => wallet.needsRecovery)).toEqual([false, true]);
    await expect(readWalletSecret(firstId)).resolves.toEqual(SECRET);
    await expect(readPinRecord()).resolves.not.toBeNull();
  });

  it('clears the flag when the wallet reads fine again', async () => {
    const { secondId } = await seedTwo();
    state().setUnreadableWallets([secondId]);
    await expect(recoverIfWalletDataMissing()).resolves.toBe(false);
    expect(state().wallets.every((wallet) => !wallet.needsRecovery)).toBe(true);
  });

  it('wipes everything when no wallet is readable', async () => {
    const { firstId, secondId } = await seedTwo();
    await deleteWalletSecret(firstId);
    await deleteWalletSecret(secondId);
    await expect(recoverIfWalletDataMissing()).resolves.toBe(true);
    expect(state()).toMatchObject({ status: 'none', wallets: [], isRecoveryRequired: true });
  });

  it('wipes every wallet when the app-wide PIN record is gone', async () => {
    const { firstId, secondId } = await seedTwo();
    await secureStorage.remove('muvo.auth.pin');
    await expect(recoverIfWalletDataMissing()).resolves.toBe(true);
    await expect(readWalletSecret(firstId)).resolves.toBeNull();
    await expect(readWalletSecret(secondId)).resolves.toBeNull();
  });
});
