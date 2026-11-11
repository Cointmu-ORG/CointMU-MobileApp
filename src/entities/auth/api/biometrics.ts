import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';

import { isRunningInExpoGo } from '@/shared/config';

/** What the device calls its biometric sensor; picks the label and icon in the UI. */
export type BiometricKind = 'face-id' | 'touch-id' | 'fingerprint' | 'face' | 'iris' | 'generic';

export type BiometricAvailability =
  | { readonly status: 'available'; readonly kind: BiometricKind }
  /** The sensor exists but no fingerprint or face is registered in the device settings. */
  | { readonly status: 'not-enrolled'; readonly kind: BiometricKind }
  /** Face ID inside Expo Go: the prompt needs our own Info.plist, so it can never succeed (Q-31). */
  | { readonly status: 'unsupported-build'; readonly kind: 'face-id' }
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

/**
 * Hardware, enrolment and sensor type. Face ID in Expo Go is reported up front as
 * `unsupported-build`, so no caller offers a prompt that is bound to fail.
 */
export async function getBiometricAvailability(
  os: string = Platform.OS,
  isExpoGo: boolean = isRunningInExpoGo(),
): Promise<BiometricAvailability> {
  if (!(await LocalAuthentication.hasHardwareAsync())) return { status: 'no-hardware' };
  const [types, isEnrolled] = await Promise.all([
    LocalAuthentication.supportedAuthenticationTypesAsync(),
    LocalAuthentication.isEnrolledAsync(),
  ]);
  const kind = toBiometricKind(types, os);
  if (kind === 'face-id' && isExpoGo) return { status: 'unsupported-build', kind };
  return { status: isEnrolled ? 'available' : 'not-enrolled', kind };
}

/** Why a biometric check did not succeed, in terms the UI can explain. */
export type BiometricFailure =
  /** The user or the system closed the prompt: not an error, nothing is shown. */
  | 'cancelled'
  | 'not-available'
  | 'not-enrolled'
  /** The device locked biometrics after too many failed tries. */
  | 'lockout'
  /** The running binary lacks NSFaceIDUsageDescription (Expo Go). */
  | 'unsupported-build'
  | 'failed';

export type BiometricOutcome = 'success' | BiometricFailure;

// A Map, not an object: a code such as "toString" must not find an inherited property.
const FAILURE_BY_ERROR_CODE: ReadonlyMap<string, BiometricFailure> = new Map([
  ['user_cancel', 'cancelled'],
  ['system_cancel', 'cancelled'],
  ['app_cancel', 'cancelled'],
  // "Use PIN" on the system sheet: the app PIN pad is already behind it.
  ['user_fallback', 'cancelled'],
  ['not_available', 'not-available'],
  ['not_enrolled', 'not-enrolled'],
  ['passcode_not_set', 'not-enrolled'],
  ['lockout', 'lockout'],
  ['missing_usage_description', 'unsupported-build'],
]);

/** Maps an `authenticateAsync` error code; anything unknown is a plain failure. */
export function toBiometricFailure(errorCode: string): BiometricFailure {
  return FAILURE_BY_ERROR_CODE.get(errorCode) ?? 'failed';
}

/** The app PIN is the fallback, not the device passcode (architecture §5). */
export async function authenticateWithBiometrics(promptMessage: string): Promise<BiometricOutcome> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage,
    disableDeviceFallback: true,
  });
  return result.success ? 'success' : toBiometricFailure(result.error);
}
