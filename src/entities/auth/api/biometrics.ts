import * as LocalAuthentication from 'expo-local-authentication';

/** Hardware present and at least one biometric enrolled. iOS Face ID needs a dev build (Q-31). */
export async function canUseBiometrics(): Promise<boolean> {
  const [hasHardware, isEnrolled] = await Promise.all([
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.isEnrolledAsync(),
  ]);
  return hasHardware && isEnrolled;
}

/** The app PIN is the fallback, not the device passcode (architecture §5). */
export async function authenticateWithBiometrics(promptMessage: string): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage,
    disableDeviceFallback: true,
  });
  return result.success;
}
