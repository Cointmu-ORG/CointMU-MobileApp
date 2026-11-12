import AsyncStorage from '@react-native-async-storage/async-storage';

import { wipeAuthRecords } from '@/entities/auth';
import { deleteAllWalletSecrets } from '@/entities/wallet';

const INSTALL_MARKER_KEY = 'muvo.installed';
const INSTALL_MARKER_VALUE = '1';

/**
 * D-33: the iOS Keychain survives uninstall, AsyncStorage does not. A missing marker means this
 * is a fresh install, so leftover SecureStore items (every wallet's secret, found through the
 * wallet id index, the PIN record and the lockout state)
 * from a previous install are wiped before anything reads them.
 * Must ship in the first public release: adding it later would wipe existing users' keys.
 */
export async function ensureFreshInstallState(): Promise<void> {
  if ((await AsyncStorage.getItem(INSTALL_MARKER_KEY)) !== null) return;
  await Promise.all([deleteAllWalletSecrets(), wipeAuthRecords()]);
  await AsyncStorage.setItem(INSTALL_MARKER_KEY, INSTALL_MARKER_VALUE);
}
