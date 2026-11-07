import { setUpTests } from 'react-native-reanimated';

// Global test setup: no test touches real native storage or a real RPC (conventions: testing).

// Public test values only; RPC calls are mocked wherever a provider is used.
process.env.EXPO_PUBLIC_RPC_URLS = 'http://rpc.test.invalid,https://rpc2.test.invalid';
process.env.EXPO_PUBLIC_CHAIN_ID = '1912';

jest.mock('expo-secure-store', () => {
  const store = new Map<string, string>();
  return {
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 5,
    __store: store,
    getItemAsync: jest.fn(async (key: string) => store.get(key) ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
    deleteItemAsync: jest.fn(async (key: string) => {
      store.delete(key);
    }),
  };
});

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn(async () => false),
  isEnrolledAsync: jest.fn(async () => false),
  authenticateAsync: jest.fn(async () => ({ success: false, error: 'not_available' })),
}));

setUpTests();

beforeEach(async () => {
  jest.requireMock<{ __store: Map<string, string> }>('expo-secure-store').__store.clear();
  await jest
    .requireMock<{ clear: () => Promise<void> }>('@react-native-async-storage/async-storage')
    .clear();
});
