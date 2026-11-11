import { useEffect, useState } from 'react';

import { reconcileBiometrics, type BiometricAvailability } from '@/entities/auth';
import { logger } from '@/shared/lib';

/**
 * What the device offers, checked when the screen opens. Also switches the setting off when
 * the enrolment disappeared since it was turned on. Null while the check runs.
 */
export function useBiometricsCheck(): BiometricAvailability | null {
  const [availability, setAvailability] = useState<BiometricAvailability | null>(null);
  useEffect(() => {
    let isMounted = true;
    reconcileBiometrics()
      .then((check) => {
        if (isMounted) setAvailability(check.availability);
      })
      .catch((error: unknown) => {
        logger.warn('Checking biometrics failed', { error });
        if (isMounted) setAvailability({ status: 'no-hardware' });
      });
    return () => {
      isMounted = false;
    };
  }, []);
  return availability;
}
