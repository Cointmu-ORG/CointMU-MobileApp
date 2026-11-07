import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import { storeNewPin, useSessionStore } from '@/entities/auth';
import { saveWalletSecret, useWalletStore } from '@/entities/wallet';
import { useSendFlowStore } from '@/features/send-transaction';
import { i18n } from '@/shared/i18n';

import { preloadRoutes } from '../../../../jest.preload-routes';

preloadRoutes();

// Public Hardhat test account; never holds real funds.
const KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const FROM = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
const TO = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
// The public BIP-39 "abandon" test phrase; never holds funds.
const PHRASE =
  'abandon ability able about above absent absorb abstract absurd abuse access accident';

// What the fake camera "sees" next.
const mockScan = { data: '' };

// A camera stand-in: one button that reports `mockScan.data` as a scanned QR code.
jest.mock('expo-camera', () => {
  const { createElement } = jest.requireActual<typeof import('react')>('react');
  const { Pressable, Text } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    useCameraPermissions: () => [
      { granted: true, canAskAgain: true, status: 'granted' },
      jest.fn(),
    ],
    CameraView: ({ onBarcodeScanned }: { onBarcodeScanned?: (r: { data: string }) => void }) =>
      createElement(
        Pressable,
        {
          accessibilityRole: 'button',
          accessibilityLabel: 'Fake camera',
          onPress: () => onBarcodeScanned?.({ data: mockScan.data }),
        },
        createElement(Text, null, 'camera'),
      ),
  };
});

// No test hits a real RPC.
jest.mock('@/shared/api', () => ({
  ...jest.requireActual('@/shared/api'),
  createRpcProvider: () => ({
    getBalance: jest.fn(async () => 10n * 10n ** 18n),
    destroy: jest.fn(),
  }),
}));

beforeEach(async () => {
  // renderRouter switches to fake timers; the PIN hash below waits for a real frame.
  jest.useRealTimers();
  await i18n.changeLanguage('en');
  await AsyncStorage.setItem('muvo.installed', '1');
  // A complete wallet, so the startup integrity check (D-39) keeps it.
  await saveWalletSecret({ kind: 'private-key', privateKey: KEY });
  await storeNewPin('135790');
  useWalletStore.getState().startPinSetup(FROM, 'private-key');
  useWalletStore.getState().activate();
  useWalletStore.setState({ hasHydrated: true });
  useSessionStore.getState().unlock();
  useSendFlowStore.getState().reset();
});

async function scanFromSend(data: string) {
  await renderRouter('./app', { initialUrl: '/send' });
  await fireEvent.press(await screen.findByRole('button', { name: 'Scan QR' }));
  mockScan.data = data;
  await fireEvent.press(await screen.findByRole('button', { name: 'Fake camera' }));
}

describe('scan', () => {
  it('fills the Send form from a payment request and sends nothing', async () => {
    await scanFromSend(`ethereum:${TO}@1912?value=1500000000000000000`);
    expect(await screen.findByDisplayValue(TO)).toBeOnTheScreen();
    expect(screen.getByDisplayValue('1.5')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Review' })).toBeOnTheScreen();
    expect(useSendFlowStore.getState()).toMatchObject({ prefill: null, draft: null });
  });

  it('refuses a recovery phrase, warns, and keeps nothing', async () => {
    await scanFromSend(PHRASE);
    expect(await screen.findByText('Never share this code')).toBeOnTheScreen();
    expect(screen.queryByText(PHRASE)).toBeNull();
    expect(useSendFlowStore.getState().prefill).toBeNull();
  });

  it('refuses a request for another chain', async () => {
    await scanFromSend(`ethereum:${TO}@1?value=1`);
    expect(await screen.findByText('Different network')).toBeOnTheScreen();
    expect(useSendFlowStore.getState().prefill).toBeNull();
  });
});
