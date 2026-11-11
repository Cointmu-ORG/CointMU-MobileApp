import * as LocalAuthentication from 'expo-local-authentication';

import {
  authenticateWithBiometrics,
  getBiometricAvailability,
  toBiometricFailure,
  toBiometricKind,
} from '../api/biometrics';
import { useAuthPrefsStore } from './auth-prefs-store';
import { disableBiometrics, enableBiometrics, reconcileBiometrics } from './biometric-setting';

const { FINGERPRINT, FACIAL_RECOGNITION, IRIS } = LocalAuthentication.AuthenticationType;
const auth = jest.mocked(LocalAuthentication);

function mockDevice(device: { hasHardware: boolean; isEnrolled: boolean; succeeds?: boolean }) {
  auth.hasHardwareAsync.mockResolvedValue(device.hasHardware);
  auth.isEnrolledAsync.mockResolvedValue(device.isEnrolled);
  auth.supportedAuthenticationTypesAsync.mockResolvedValue([FINGERPRINT]);
  auth.authenticateAsync.mockResolvedValue(
    device.succeeds
      ? { success: true }
      : ({ success: false, error: 'user_cancel' } as LocalAuthentication.LocalAuthenticationResult),
  );
}

const prefs = () => useAuthPrefsStore.getState();

beforeEach(() => {
  jest.clearAllMocks();
  useAuthPrefsStore.setState({ isBiometricsEnabled: false, hasBiometricsOffNotice: false });
});

describe('toBiometricKind', () => {
  it('names the single iOS sensor', () => {
    expect(toBiometricKind([FACIAL_RECOGNITION], 'ios')).toBe('face-id');
    expect(toBiometricKind([FINGERPRINT], 'ios')).toBe('touch-id');
  });

  it('names an Android sensor only when there is exactly one', () => {
    expect(toBiometricKind([FINGERPRINT], 'android')).toBe('fingerprint');
    expect(toBiometricKind([FACIAL_RECOGNITION], 'android')).toBe('face');
    expect(toBiometricKind([IRIS], 'android')).toBe('iris');
    expect(toBiometricKind([FINGERPRINT, FACIAL_RECOGNITION], 'android')).toBe('generic');
    expect(toBiometricKind([], 'android')).toBe('generic');
  });
});

describe('getBiometricAvailability', () => {
  it('tells no hardware, nothing enrolled and available apart', async () => {
    mockDevice({ hasHardware: false, isEnrolled: false });
    await expect(getBiometricAvailability('android')).resolves.toEqual({ status: 'no-hardware' });

    mockDevice({ hasHardware: true, isEnrolled: false });
    await expect(getBiometricAvailability('android')).resolves.toEqual({
      status: 'not-enrolled',
      kind: 'fingerprint',
    });

    mockDevice({ hasHardware: true, isEnrolled: true });
    await expect(getBiometricAvailability('ios')).resolves.toEqual({
      status: 'available',
      kind: 'touch-id',
    });
  });
});

describe('Face ID in Expo Go (Q-31)', () => {
  const mockSensor = (type: LocalAuthentication.AuthenticationType) => {
    auth.hasHardwareAsync.mockResolvedValue(true);
    auth.isEnrolledAsync.mockResolvedValue(true);
    auth.supportedAuthenticationTypesAsync.mockResolvedValue([type]);
  };

  it('reports Face ID inside Expo Go as unsupported instead of available', async () => {
    mockSensor(FACIAL_RECOGNITION);
    await expect(getBiometricAvailability('ios', true)).resolves.toEqual({
      status: 'unsupported-build',
      kind: 'face-id',
    });
  });

  it('leaves Face ID in an installed build, Touch ID and Android alone', async () => {
    mockSensor(FACIAL_RECOGNITION);
    await expect(getBiometricAvailability('ios', false)).resolves.toMatchObject({
      status: 'available',
    });
    await expect(getBiometricAvailability('android', true)).resolves.toMatchObject({
      status: 'available',
      kind: 'face',
    });
    mockSensor(FINGERPRINT);
    await expect(getBiometricAvailability('ios', true)).resolves.toMatchObject({
      status: 'available',
      kind: 'touch-id',
    });
  });

  it('never prompts and never turns the setting on', async () => {
    mockSensor(FACIAL_RECOGNITION);
    const availability = await getBiometricAvailability('ios', true);
    expect(availability.status).not.toBe('available');
    expect(auth.authenticateAsync).not.toHaveBeenCalled();
  });
});

describe('toBiometricFailure', () => {
  it.each([
    ['user_cancel', 'cancelled'],
    ['system_cancel', 'cancelled'],
    ['app_cancel', 'cancelled'],
    ['user_fallback', 'cancelled'],
    ['not_available', 'not-available'],
    ['not_enrolled', 'not-enrolled'],
    ['passcode_not_set', 'not-enrolled'],
    ['lockout', 'lockout'],
    ['missing_usage_description', 'unsupported-build'],
    ['authentication_failed', 'failed'],
    ['unknown: -1000, something new', 'failed'],
    // An object key that is not an error code must not leak through the lookup.
    ['toString', 'failed'],
  ])('maps %s to %s', (code, failure) => {
    expect(toBiometricFailure(code)).toBe(failure);
  });

  it('passes the mapped reason out of the prompt', async () => {
    auth.authenticateAsync.mockResolvedValue({ success: false, error: 'lockout' });
    await expect(authenticateWithBiometrics('Unlock')).resolves.toBe('lockout');
    auth.authenticateAsync.mockResolvedValue({ success: true });
    await expect(authenticateWithBiometrics('Unlock')).resolves.toBe('success');
  });
});

describe('enableBiometrics', () => {
  it('turns the setting on only after a successful biometric check', async () => {
    mockDevice({ hasHardware: true, isEnrolled: true, succeeds: true });
    await expect(enableBiometrics('Turn on')).resolves.toBe('enabled');
    expect(prefs().isBiometricsEnabled).toBe(true);
    expect(auth.authenticateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ promptMessage: 'Turn on', disableDeviceFallback: true }),
    );
  });

  it('stays off when the prompt is cancelled or fails', async () => {
    mockDevice({ hasHardware: true, isEnrolled: true, succeeds: false });
    await expect(enableBiometrics('Turn on')).resolves.toBe('cancelled');
    expect(prefs().isBiometricsEnabled).toBe(false);
  });

  it('never prompts on a device without a sensor or without enrolment', async () => {
    mockDevice({ hasHardware: true, isEnrolled: false, succeeds: true });
    await expect(enableBiometrics('Turn on')).resolves.toBe('unavailable');
    mockDevice({ hasHardware: false, isEnrolled: false, succeeds: true });
    await expect(enableBiometrics('Turn on')).resolves.toBe('unavailable');

    expect(auth.authenticateAsync).not.toHaveBeenCalled();
    expect(prefs().isBiometricsEnabled).toBe(false);
  });

  it('turns off without any check', () => {
    useAuthPrefsStore.setState({ isBiometricsEnabled: true });
    disableBiometrics();
    expect(prefs().isBiometricsEnabled).toBe(false);
    expect(auth.authenticateAsync).not.toHaveBeenCalled();
  });
});

describe('reconcileBiometrics (fallback to PIN)', () => {
  it('switches the setting off and leaves a notice when the enrolment is gone', async () => {
    useAuthPrefsStore.setState({ isBiometricsEnabled: true });
    mockDevice({ hasHardware: true, isEnrolled: false });

    await expect(reconcileBiometrics()).resolves.toMatchObject({ wasTurnedOff: true });
    expect(prefs().isBiometricsEnabled).toBe(false);
    expect(prefs().hasBiometricsOffNotice).toBe(true);
  });

  it('leaves a working setup alone', async () => {
    useAuthPrefsStore.setState({ isBiometricsEnabled: true });
    mockDevice({ hasHardware: true, isEnrolled: true });

    await expect(reconcileBiometrics()).resolves.toMatchObject({ wasTurnedOff: false });
    expect(prefs().isBiometricsEnabled).toBe(true);
    expect(prefs().hasBiometricsOffNotice).toBe(false);
  });

  it('leaves no notice when the setting was already off', async () => {
    mockDevice({ hasHardware: false, isEnrolled: false });
    await expect(reconcileBiometrics()).resolves.toEqual({
      availability: { status: 'no-hardware' },
      wasTurnedOff: false,
    });
    expect(prefs().hasBiometricsOffNotice).toBe(false);
  });

  it('clears the notice once biometrics are turned on again', async () => {
    useAuthPrefsStore.setState({ hasBiometricsOffNotice: true });
    mockDevice({ hasHardware: true, isEnrolled: true, succeeds: true });
    await enableBiometrics('Turn on');
    expect(prefs().hasBiometricsOffNotice).toBe(false);
  });
});
