import { render, screen } from '@testing-library/react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';

import { i18n } from '@/shared/i18n';

import { BiometricsRow } from './biometrics-row';

jest.mock('@/shared/config', () => ({
  ...jest.requireActual('@/shared/config'),
  isRunningInExpoGo: jest.fn(() => true),
}));

const auth = jest.mocked(LocalAuthentication);

describe('BiometricsRow in Expo Go on an iPhone with Face ID', () => {
  const originalOs = Platform.OS;
  afterEach(() => {
    Platform.OS = originalOs;
  });

  it('is unavailable and says Face ID needs the installed app', async () => {
    Platform.OS = 'ios';
    await i18n.changeLanguage('en');
    auth.hasHardwareAsync.mockResolvedValue(true);
    auth.isEnrolledAsync.mockResolvedValue(true);
    auth.supportedAuthenticationTypesAsync.mockResolvedValue([
      LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
    ]);
    const onEnableRequested = jest.fn();
    await render(<BiometricsRow onEnableRequested={onEnableRequested} />);

    expect(
      await screen.findByText('Face ID works in the installed app, not in Expo Go.'),
    ).toBeOnTheScreen();
    expect(screen.getByRole('switch').props.disabled).toBe(true);
    expect(auth.authenticateAsync).not.toHaveBeenCalled();
  });
});
