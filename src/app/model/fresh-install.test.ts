import AsyncStorage from '@react-native-async-storage/async-storage';

import { pinHasher, readPinRecord, writePinRecord } from '@/entities/auth';
import {
  createWalletId,
  LEGACY_WALLET_ID,
  readWalletSecret,
  saveWalletSecret,
} from '@/entities/wallet';

import { ensureFreshInstallState } from './fresh-install';

const PHRASE = 'test test test test test test test test test test test junk';
const SECRET = { kind: 'mnemonic', phrase: PHRASE } as const;

/** What a previous install leaves in the iOS Keychain: the old key, two wallets and the PIN. */
async function seedLeftoverKeychain() {
  const ids = [LEGACY_WALLET_ID, createWalletId(), createWalletId()];
  for (const id of ids) await saveWalletSecret(id, SECRET);
  await writePinRecord(await pinHasher.hash('123456'));
  return ids;
}

describe('ensureFreshInstallState', () => {
  it('wipes every wallet key when the install marker is missing (iOS reinstall)', async () => {
    const ids = await seedLeftoverKeychain();
    await ensureFreshInstallState();
    for (const id of ids) await expect(readWalletSecret(id)).resolves.toBeNull();
    await expect(readPinRecord()).resolves.toBeNull();
    await expect(AsyncStorage.getItem('muvo.installed')).resolves.not.toBeNull();
  });

  it('keeps secrets on a normal launch', async () => {
    await ensureFreshInstallState();
    const ids = await seedLeftoverKeychain();
    await ensureFreshInstallState();
    for (const id of ids) await expect(readWalletSecret(id)).resolves.toEqual(SECRET);
    await expect(readPinRecord()).resolves.not.toBeNull();
  });
});
