import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { useFocusEffect } from 'expo-router';
import Camera from 'lucide-react-native/icons/camera';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, StyleSheet, View } from 'react-native';

import { Button, colors, ICON_SIZE, Spinner, Text } from '@/shared/ui';

type QrScannerProps = {
  /** Called once per code. The parent pauses scanning while it shows the result. */
  onScanned: (data: string) => void;
  isPaused: boolean;
};

function PermissionRequest({ canAskAgain, onAsk }: { canAskAgain: boolean; onAsk: () => void }) {
  const { t } = useTranslation();
  return (
    <View className="flex-1 items-center justify-center gap-4 px-2">
      <View className="h-16 w-16 items-center justify-center rounded-card bg-primary-50">
        <Camera size={ICON_SIZE.lg} color={colors.primary[600]} />
      </View>
      <Text variant="heading" accessibilityRole="header" className="text-center">
        {t('scan.permission.title')}
      </Text>
      <Text tone="secondary" className="text-center">
        {canAskAgain ? t('scan.permission.body') : t('scan.permission.denied')}
      </Text>
      {canAskAgain ? (
        <Button label={t('scan.permission.allow')} onPress={onAsk} />
      ) : (
        <Button
          label={t('scan.permission.openSettings')}
          onPress={() => void Linking.openSettings()}
        />
      )}
    </View>
  );
}

/**
 * Back camera that reads QR codes only. The camera runs only while this screen is focused
 * (one preview at a time), and stops reporting after the first code until resumed.
 */
export function QrScanner({ onScanned, isPaused }: QrScannerProps) {
  const { t } = useTranslation();
  const [permission, requestPermission] = useCameraPermissions();
  const [isFocused, setIsFocused] = useState(false);
  const isHandling = useRef(false);

  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      return () => setIsFocused(false);
    }, []),
  );

  // The camera reports the same code many times per second; take the first, re-arm on resume.
  useEffect(() => {
    if (!isPaused) isHandling.current = false;
  }, [isPaused]);

  const handle = useCallback(
    ({ data }: BarcodeScanningResult) => {
      if (isHandling.current) return;
      isHandling.current = true;
      onScanned(data);
    },
    [onScanned],
  );

  if (permission === null) return <Spinner label={t('scan.permission.checking')} />;
  if (!permission.granted) {
    return (
      <PermissionRequest
        canAskAgain={permission.canAskAgain}
        onAsk={() => void requestPermission()}
      />
    );
  }
  return (
    <View
      className="flex-1 overflow-hidden rounded-card bg-content"
      accessibilityLabel={t('scan.cameraLabel')}
    >
      {isFocused ? (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={isPaused ? undefined : handle}
        />
      ) : null}
    </View>
  );
}
