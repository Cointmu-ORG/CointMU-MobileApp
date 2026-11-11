import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';

/** What the device calls its biometric sensor; picks the label and icon in the UI. */
export type BiometricKind = 'face-id' | 'touch-id' | 'fingerprint' | 'face' | 'iris' | 'generic';

export type BiometricAvailability =
  | { readonly status: 'available'; readonly kind: BiometricKind }
  /** The sensor exists but no fingerprint or face is registered in the device settings. */
  | { readonly status: 'not-enrolled'; readonly kind: BiometricKind }
  | { readonly status: 'no-hardware' };

const { FINGERPRINT, FACIAL_RECOGNITION, IRIS } = LocalAuthentication.AuthenticationType;

/**
 * iOS has exactly one sensor and names it. Android may have several and picks one itself when
 * the prompt opens, so more than one type is just "biometrics".
 */
export function toBiometricKind(
  types: readonly LocalAuthentication.AuthenticationType[],
  os: string,
): BiometricKind {
  if (os === 'ios') {
    if (types.includes(FACIAL_RECOGNITION)) return 'face-id';
    return types.includes(FINGERPRINT) ? 'touch-id' : 'generic';
  }
  if (types.length !== 1) return 'generic';
  if (types[0] === FINGERPRINT) return 'fingerprint';
  if (types[0] === FACIAL_RECOGNITION) return 'face';
  return types[0] === IRIS ? 'iris' : 'generic';
}

/** Hardware, enrolment and sensor type. iOS Face ID needs a dev or release build (Q-31). */
export async function getBiometricAvailability(
  os: string = Platform.OS,
): Promise<BiometricAvailability> {
  if (!(await LocalAuthentication.hasHardwareAsync())) return { status: 'no-hardware' };
  const [types, isEnrolled] = await Promise.all([
    LocalAuthentication.supportedAuthenticationTypesAsync(),
    LocalAuthentication.isEnrolledAsync(),
  ]);
  const kind = toBiometricKind(types, os);
  return { status: isEnrolled ? 'available' : 'not-enrolled', kind };
}

/** The app PIN is the fallback, not the device passcode (architecture §5). */
export async function authenticateWithBiometrics(promptMessage: string): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage,
    disableDeviceFallback: true,
  });
  return result.success;
}
