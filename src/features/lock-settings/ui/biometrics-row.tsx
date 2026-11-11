import { useTranslation } from 'react-i18next';

import { disableBiometrics, useAuthPrefsStore } from '@/entities/auth';
import { SettingsSwitchRow } from '@/shared/ui';

import { useBiometricLabel } from './biometric-label';
import { useBiometricsCheck } from './use-biometrics-check';

type BiometricsRowProps = {
  /** Turning it on continues on its own screen: PIN first, then the biometric prompt. */
  onEnableRequested: () => void;
};

/**
 * Security > biometric unlock. Named after the device's sensor. Disabled, with the reason, when
 * the phone has no sensor, nothing is enrolled, or Face ID is asked for inside Expo Go. Turning it off is immediate.
 */
export function BiometricsRow({ onEnableRequested }: BiometricsRowProps) {
  const { t } = useTranslation();
  const isEnabled = useAuthPrefsStore((state) => state.isBiometricsEnabled);
  const availability = useBiometricsCheck();
  const kind =
    availability === null || availability.status === 'no-hardware' ? null : availability.kind;
  const { name, icon } = useBiometricLabel(kind);
  const isAvailable = availability?.status === 'available';

  const description = (): string => {
    if (availability === null) return t('settings.biometrics.checking');
    if (availability.status === 'no-hardware') return t('settings.biometrics.noHardware');
    if (availability.status === 'not-enrolled') {
      return t('settings.biometrics.notEnrolled', { name });
    }
    if (availability.status === 'unsupported-build') {
      return t('biometrics.error.unsupported-build');
    }
    return t('settings.biometrics.description');
  };

  return (
    <SettingsSwitchRow
      icon={icon}
      title={t('settings.biometrics.rowTitle', { name })}
      description={description()}
      value={isEnabled && isAvailable}
      onValueChange={(next) => (next ? onEnableRequested() : disableBiometrics())}
      isDisabled={!isAvailable}
    />
  );
}
