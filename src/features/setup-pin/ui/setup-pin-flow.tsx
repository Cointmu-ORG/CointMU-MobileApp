import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { getBiometricAvailability, NewPinForm, storeNewPin } from '@/entities/auth';

import { finishOnboarding } from '../model/finish-onboarding';
import { BiometricsOffer } from './biometrics-offer';

/** Onboarding PIN: create and confirm, hash once, then optionally offer biometrics. */
export function SetupPinFlow() {
  const { t } = useTranslation();
  const [isOfferingBiometrics, setIsOfferingBiometrics] = useState(false);

  const save = useCallback(async (pin: string) => {
    await storeNewPin(pin);
    const { status } = await getBiometricAvailability();
    if (status === 'available') return setIsOfferingBiometrics(true);
    finishOnboarding();
  }, []);

  if (isOfferingBiometrics) return <BiometricsOffer onDone={finishOnboarding} />;
  return (
    <NewPinForm
      createTitle={t('onboarding.setPin.titleCreate')}
      confirmTitle={t('onboarding.setPin.titleConfirm')}
      subtitle={t('onboarding.setPin.subtitle')}
      errorMessage={t('onboarding.setPin.error')}
      onConfirmed={save}
    />
  );
}
