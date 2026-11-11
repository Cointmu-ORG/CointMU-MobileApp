import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as LocalAuthentication from 'expo-local-authentication';

import { storeNewPin, useAuthPrefsStore } from '@/entities/auth';
import { i18n } from '@/shared/i18n';

import { EnableBiometricsFlow } from './enable-biometrics-flow';

const PIN = '135790';
const auth = jest.mocked(LocalAuthentication);

async function typePin(pin: string) {
  for (const digit of pin) {
    await fireEvent.press(await screen.findByRole('button', { name: digit }));
  }
}

beforeEach(async () => {
  jest.clearAllMocks();
  await i18n.changeLanguage('en');
  await storeNewPin(PIN);
  useAuthPrefsStore.setState({ isBiometricsEnabled: false, hasBiometricsOffNotice: false });
  auth.hasHardwareAsync.mockResolvedValue(true);
  auth.isEnrolledAsync.mockResolvedValue(true);
  auth.supportedAuthenticationTypesAsync.mockResolvedValue([
    LocalAuthentication.AuthenticationType.FINGERPRINT,
  ]);
});

describe('EnableBiometricsFlow', () => {
  it('asks for the PIN first and never prompts biometrics on a wrong PIN', async () => {
    await render(<EnableBiometricsFlow onDone={jest.fn()} />);
    expect(await screen.findByText('Enter your PIN')).toBeOnTheScreen();

    await typePin('000000');
    expect(await screen.findByText('Wrong PIN')).toBeOnTheScreen();
    expect(auth.authenticateAsync).not.toHaveBeenCalled();
    expect(useAuthPrefsStore.getState().isBiometricsEnabled).toBe(false);
  });

  it('turns biometrics on after the PIN and a successful biometric check', async () => {
    auth.authenticateAsync.mockResolvedValue({ success: true });
    const onDone = jest.fn();
    await render(<EnableBiometricsFlow onDone={onDone} />);

    await typePin(PIN);
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    expect(auth.authenticateAsync).toHaveBeenCalledTimes(1);
    expect(useAuthPrefsStore.getState().isBiometricsEnabled).toBe(true);
  });

  it('stays off and offers another try when the biometric check is cancelled', async () => {
    auth.authenticateAsync.mockResolvedValue({
      success: false,
      error: 'user_cancel',
    } as LocalAuthentication.LocalAuthenticationResult);
    const onDone = jest.fn();
    await render(<EnableBiometricsFlow onDone={onDone} />);

    await typePin(PIN);
    expect(await screen.findByText(/so it stays off/)).toBeOnTheScreen();
    expect(useAuthPrefsStore.getState().isBiometricsEnabled).toBe(false);
    expect(onDone).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeOnTheScreen();
  });
});
