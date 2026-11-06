import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';

import { logger } from '@/shared/lib';

import { resetWallet } from '../model/reset-wallet';

/** Returns a handler that asks twice before wiping the wallet (architecture §5). */
export function useConfirmReset(): () => void {
  const { t } = useTranslation();

  return useCallback(() => {
    const cancel = { text: t('common.cancel'), style: 'cancel' } as const;
    const runReset = () => {
      resetWallet().catch((error: unknown) => logger.error('Wallet reset failed', { error }));
    };
    const askFinal = () =>
      Alert.alert(t('reset.finalTitle'), t('reset.finalBody'), [
        cancel,
        { text: t('reset.confirm'), style: 'destructive', onPress: runReset },
      ]);
    Alert.alert(t('reset.confirmTitle'), t('reset.confirmBody'), [
      cancel,
      { text: t('common.continue'), style: 'destructive', onPress: askFinal },
    ]);
  }, [t]);
}
