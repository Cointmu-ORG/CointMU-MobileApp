import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AppState, Linking, type AppStateStatus } from 'react-native';

import { i18n } from '@/shared/i18n';

import { QrScanner } from './qr-scanner';

type Permission = { granted: boolean; canAskAgain: boolean; status: string };

const UNDETERMINED: Permission = { granted: false, canAskAgain: true, status: 'undetermined' };
const GRANTED: Permission = { granted: true, canAskAgain: true, status: 'granted' };
const DENIED: Permission = { granted: false, canAskAgain: true, status: 'denied' };
const BLOCKED: Permission = { granted: false, canAskAgain: false, status: 'denied' };

// What the OS reports now, what its prompt will answer, and what the settings app changed it to.
const mockOs = { current: UNDETERMINED, promptAnswer: GRANTED, afterSettings: GRANTED };
const mockPrompt = jest.fn();

jest.mock('expo-camera', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    useCameraPermissions: () => {
      const [permission, setPermission] = React.useState(mockOs.current);
      const request = async () => {
        mockPrompt();
        setPermission(mockOs.promptAnswer);
        return mockOs.promptAnswer;
      };
      const refresh = async () => {
        setPermission(mockOs.afterSettings);
        return mockOs.afterSettings;
      };
      return [permission, request, refresh];
    },
    CameraView: () => React.createElement(Text, null, 'camera preview'),
  };
});

// The scanner only needs "this screen is focused"; no navigator is mounted here.
jest.mock('expo-router', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  return {
    useFocusEffect: (effect: () => void | (() => void)) => React.useEffect(effect, [effect]),
  };
});

const onDismiss = jest.fn();

async function renderScanner(current: Permission) {
  mockOs.current = current;
  await render(<QrScanner onScanned={jest.fn()} isPaused={false} onDismiss={onDismiss} />);
}

/** Captures the AppState listener so a test can bring the app back to the foreground. */
function spyOnAppState() {
  const listeners: ((state: AppStateStatus) => void)[] = [];
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
    listeners.push(listener as (state: AppStateStatus) => void);
    return { remove: jest.fn() } as unknown as ReturnType<typeof AppState.addEventListener>;
  });
  return (state: AppStateStatus) => listeners.forEach((listener) => listener(state));
}

beforeEach(async () => {
  jest.clearAllMocks();
  mockOs.promptAnswer = GRANTED;
  mockOs.afterSettings = GRANTED;
  await i18n.changeLanguage('en');
});

afterEach(() => jest.restoreAllMocks());

describe('QrScanner camera consent', () => {
  it('first time: explains before the OS prompt, which opens only from Continue', async () => {
    await renderScanner(UNDETERMINED);

    expect(screen.getByRole('header', { name: 'Scan with your camera' })).toBeOnTheScreen();
    expect(
      screen.getByText(/scan QR codes of CointMU addresses and payment requests/),
    ).toBeOnTheScreen();
    expect(screen.getByText(/No photo or video is taken or stored/)).toBeOnTheScreen();
    expect(screen.queryByText('camera preview')).toBeNull();
    expect(mockPrompt).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    expect(mockPrompt).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('camera preview')).toBeOnTheScreen();
  });

  it('first time: Not now leaves without asking for the camera', async () => {
    await renderScanner(UNDETERMINED);
    await fireEvent.press(screen.getByRole('button', { name: 'Not now' }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(mockPrompt).not.toHaveBeenCalled();
  });

  it('granted: goes straight to the camera', async () => {
    await renderScanner(GRANTED);
    expect(screen.getByText('camera preview')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Continue' })).toBeNull();
    expect(mockPrompt).not.toHaveBeenCalled();
  });

  it('denied, can ask again: shows the explanation again and Continue asks once more', async () => {
    mockOs.promptAnswer = DENIED;
    await renderScanner(DENIED);

    expect(screen.getByText(/No photo or video is taken or stored/)).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Open settings' })).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));

    expect(mockPrompt).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Continue' })).toBeOnTheScreen();
    expect(screen.queryByText('camera preview')).toBeNull();
  });

  it('denied permanently: offers the phone settings instead of the OS prompt', async () => {
    const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);
    const setAppState = spyOnAppState();
    await renderScanner(BLOCKED);

    expect(
      screen.getByText(/scan QR codes of CointMU addresses and payment requests/),
    ).toBeOnTheScreen();
    expect(screen.getByText(/Camera access is off for Muvo/)).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Continue' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Not now' })).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Open settings' }));
    expect(openSettings).toHaveBeenCalledTimes(1);
    expect(mockPrompt).not.toHaveBeenCalled();

    // Allowed in the settings app, then back in Muvo.
    await act(async () => setAppState('active'));
    expect(await screen.findByText('camera preview')).toBeOnTheScreen();
  });
});
