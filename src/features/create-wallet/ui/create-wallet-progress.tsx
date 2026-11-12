import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { logger } from '@/shared/lib';
import { Button, Spinner, Text } from '@/shared/ui';

import { createWallet } from '../model/create-wallet';

type CreateWalletProgressProps = {
  /** Called with the new wallet's id. Onboarding needs none: the wallet status moves the router. */
  onCreated?: (walletId: string) => void;
};

/** Starts wallet creation on mount. In onboarding, success flips wallet status and the router moves on. */
export function CreateWalletProgress({ onCreated }: CreateWalletProgressProps) {
  const { t } = useTranslation();
  const [hasFailed, setHasFailed] = useState(false);
  const hasStarted = useRef(false);

  const run = useCallback(async () => {
    setHasFailed(false);
    try {
      // Not `onCreated?.(await createWallet())`: without a callback that skips the creation too.
      const walletId = await createWallet();
      onCreated?.(walletId);
    } catch (error) {
      logger.error('Wallet creation failed', { error });
      setHasFailed(true);
    }
  }, [onCreated]);

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;
    void run();
  }, [run]);

  if (hasFailed) {
    return (
      <View className="items-center gap-4">
        <Text tone="danger" accessibilityLiveRegion="polite">
          {t('onboarding.create.error')}
        </Text>
        <Button label={t('onboarding.create.retry')} onPress={() => void run()} />
      </View>
    );
  }

  return (
    <View className="items-center gap-6">
      <Spinner label={t('onboarding.create.progress')} />
      <Text tone="secondary" className="text-center">
        {t('onboarding.create.progress')}
      </Text>
    </View>
  );
}
