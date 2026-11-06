import AsyncStorage from '@react-native-async-storage/async-storage';

import { pinHasher, readPinRecord, writePinRecord } from '@/entities/auth';
import { readWalletSecret, saveWalletSecret } from '@/entities/wallet';

import { ensureFreshInstallState } from './fresh-install';

const PHRASE = 'test test test test test test test test test test test junk';

async function seedLeftoverKeychain() {
  await saveWalletSecret({ kind: 'mnemonic', phrase: PHRASE });
  await writePinRecord(await pinHasher.hash('123456'));
}

describe('ensureFreshInstallState', () => {
  it('wipes keychain leftovers when the install marker is missing (iOS reinstall)', async () => {
    await seedLeftoverKeychain();
    await ensureFreshInstallState();
    await expect(readWalletSecret()).resolves.toBeNull();
    await expect(readPinRecord()).resolves.toBeNull();
    await expect(AsyncStorage.getItem('muvo.installed')).resolves.not.toBeNull();
  });

  it('keeps secrets on a normal launch', async () => {
    await ensureFreshInstallState();
    await seedLeftoverKeychain();
    await ensureFreshInstallState();
    await expect(readWalletSecret()).resolves.toEqual({ kind: 'mnemonic', phrase: PHRASE });
    await expect(readPinRecord()).resolves.not.toBeNull();
  });
});
