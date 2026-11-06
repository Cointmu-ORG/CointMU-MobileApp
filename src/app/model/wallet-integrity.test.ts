import { pinHasher, readPinRecord, writePinRecord } from '@/entities/auth';
import { readWalletSecret, saveWalletSecret, useWalletStore } from '@/entities/wallet';
import { secureStorage } from '@/shared/lib';

import { isWalletDataMissing, recoverIfWalletDataMissing } from './wallet-integrity';

const PHRASE = 'test test test test test test test test test test test junk';
const ADDRESS = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

describe('isWalletDataMissing', () => {
  it.each([
    ['none', false, false, false],
    ['pendingBackup', true, false, false],
    ['pendingBackup', false, false, true],
    ['pendingPin', true, false, false],
    ['pendingPin', false, false, true],
    ['active', true, true, false],
    ['active', false, true, true],
    ['active', true, false, true],
    ['active', false, false, true],
  ] as const)(
    '%s (secret: %s, pin: %s) → missing %s',
    (status, hasSecret, hasPinRecord, missing) => {
      expect(isWalletDataMissing({ status, hasSecret, hasPinRecord })).toBe(missing);
    },
  );
});

async function seedActiveWallet() {
  await saveWalletSecret({ kind: 'mnemonic', phrase: PHRASE });
  await writePinRecord(await pinHasher.hash('123456'));
  useWalletStore.setState({ status: 'active', address: ADDRESS, source: 'mnemonic' });
}

beforeEach(() => useWalletStore.getState().reset());

describe('recoverIfWalletDataMissing', () => {
  it('leaves a healthy wallet untouched', async () => {
    await seedActiveWallet();
    await expect(recoverIfWalletDataMissing()).resolves.toBe(false);
    expect(useWalletStore.getState()).toMatchObject({
      status: 'active',
      isRecoveryRequired: false,
    });
    await expect(readWalletSecret()).resolves.not.toBeNull();
  });

  it('wipes and flags recovery when an active wallet lost its PIN record', async () => {
    await seedActiveWallet();
    await secureStorage.remove('muvo.auth.pin');
    await expect(recoverIfWalletDataMissing()).resolves.toBe(true);
    expect(useWalletStore.getState()).toMatchObject({
      status: 'none',
      address: null,
      isRecoveryRequired: true,
    });
    await expect(readWalletSecret()).resolves.toBeNull();
  });

  it('treats an unreadable secret as missing', async () => {
    await seedActiveWallet();
    await secureStorage.set('muvo.wallet.secret', '{not json');
    await expect(recoverIfWalletDataMissing()).resolves.toBe(true);
    await expect(readPinRecord()).resolves.toBeNull();
  });

  it('accepts pendingBackup without a PIN record', async () => {
    await saveWalletSecret({ kind: 'mnemonic', phrase: PHRASE });
    useWalletStore.getState().startBackup(ADDRESS);
    await expect(recoverIfWalletDataMissing()).resolves.toBe(false);
    expect(useWalletStore.getState().status).toBe('pendingBackup');
  });

  it('flags recovery when pendingBackup lost its secret', async () => {
    useWalletStore.getState().startBackup(ADDRESS);
    await expect(recoverIfWalletDataMissing()).resolves.toBe(true);
    expect(useWalletStore.getState().isRecoveryRequired).toBe(true);
  });
});
