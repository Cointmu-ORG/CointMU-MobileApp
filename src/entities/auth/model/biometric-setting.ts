import {
  authenticateWithBiometrics,
  getBiometricAvailability,
  type BiometricAvailability,
} from '../api/biometrics';
import { useAuthPrefsStore } from './auth-prefs-store';

export type EnableBiometricsResult = 'enabled' | 'unavailable' | 'not-confirmed';

/**
 * Turns biometric unlock on. Call only after the PIN was verified (the enable screen does):
 * someone holding an unlocked phone must not be able to add their own way in. The setting is
 * saved only after one successful biometric check, so it is never on for a sensor that does
 * not work.
 */
export async function enableBiometrics(prompt: string): Promise<EnableBiometricsResult> {
  const availability = await getBiometricAvailability();
  if (availability.status !== 'available') return 'unavailable';
  if (!(await authenticateWithBiometrics(prompt))) return 'not-confirmed';
  const prefs = useAuthPrefsStore.getState();
  prefs.setBiometricsEnabled(true);
  prefs.setBiometricsOffNotice(false);
  return 'enabled';
}

/** Turning it off needs nothing: it only removes a shortcut, the PIN still guards the wallet. */
export function disableBiometrics(): void {
  useAuthPrefsStore.getState().setBiometricsEnabled(false);
}

export type BiometricsCheck = {
  readonly availability: BiometricAvailability;
  /** True when this call switched the setting off because biometrics are gone. */
  readonly wasTurnedOff: boolean;
};

/**
 * Keeps the setting honest. If biometric unlock is on but the device no longer has a usable
 * sensor or enrolment (the user removed their fingerprints or face), the setting is switched
 * off and a notice is left for the Security screen. The PIN keeps working throughout.
 */
export async function reconcileBiometrics(): Promise<BiometricsCheck> {
  const availability = await getBiometricAvailability();
  const prefs = useAuthPrefsStore.getState();
  if (!prefs.isBiometricsEnabled || availability.status === 'available') {
    return { availability, wasTurnedOff: false };
  }
  prefs.setBiometricsEnabled(false);
  prefs.setBiometricsOffNotice(true);
  return { availability, wasTurnedOff: true };
}
