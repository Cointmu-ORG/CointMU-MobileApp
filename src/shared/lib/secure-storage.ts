import * as SecureStore from 'expo-secure-store';

// Every secret and auth record uses the strictest accessibility that still allows the app to
// read it while unlocked, and never syncs to iCloud or another device (architecture §5).
const OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

export const secureStorage = {
  get: (key: string): Promise<string | null> => SecureStore.getItemAsync(key, OPTIONS),
  set: (key: string, value: string): Promise<void> => SecureStore.setItemAsync(key, value, OPTIONS),
  remove: (key: string): Promise<void> => SecureStore.deleteItemAsync(key, OPTIONS),
};
