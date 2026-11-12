import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { parsePaymentQr, QrScanner, type ScanError } from '@/features/scan-qr';
import { useSendFlowStore } from '@/features/send-transaction';
import { findAsset, getAssetKey, NATIVE_ASSET } from '@/entities/asset';
import { network } from '@/entities/network';
import { ROUTES } from '@/shared/config';
import { Button, Notice, Screen, Text } from '@/shared/ui';

type ScanProblem = ScanError | 'unknownToken';

/**
 * Scans a payment QR and only prefills the Send form; it never sends. Opened from Send (goes
 * back to it) or from Home (opens Send). The scanned text is never logged or kept.
 */
export function ScanPage() {
  const { t } = useTranslation();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const [problem, setProblem] = useState<ScanProblem | null>(null);

  const onScanned = (data: string) => {
    const result = parsePaymentQr(data, network.chainId);
    if (!result.ok) return setProblem(result.error);
    const { to, token, amount } = result.request;
    const assetKey = token === null ? getAssetKey(NATIVE_ASSET) : token.toLowerCase();
    // A token we don't know has unknown decimals: never guess, ask the user to add it first.
    if (findAsset(assetKey) === null) return setProblem('unknownToken');
    useSendFlowStore.getState().setPrefill({ to, assetKey, amount });
    if (from === 'send') router.back();
    else router.replace(ROUTES.send);
  };

  return (
    <Screen className="gap-4">
      <QrScanner
        onScanned={onScanned}
        isPaused={problem !== null}
        onDismiss={() => router.back()}
      />
      {problem === null ? (
        <Text tone="secondary" className="text-center">
          {t('scan.hint')}
        </Text>
      ) : (
        <View className="gap-3">
          <Notice
            tone={problem === 'secret' ? 'danger' : 'warning'}
            title={t(`scan.errors.${problem}.title`)}
          >
            {t(`scan.errors.${problem}.body`, { chainId: network.chainId })}
          </Notice>
          <Button variant="secondary" label={t('scan.again')} onPress={() => setProblem(null)} />
        </View>
      )}
    </Screen>
  );
}
