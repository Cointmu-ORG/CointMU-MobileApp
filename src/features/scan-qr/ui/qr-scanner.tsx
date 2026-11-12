import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppState, Linking, StyleSheet, View } from 'react-native';

import { logger } from '@/shared/lib';
import { Spinner } from '@/shared/ui';

import { CameraConsent } from './camera-consent';

type QrScannerProps = {
  /** Called once per code. The parent pauses scanning while it shows the result. */
  onScanned: (data: string) => void;
  isPaused: boolean;
  /** "Not now" on the camera explanation: leave the scanner without asking for the camera. */
  onDismiss: () => void;
};

/**
 * Back camera that reads QR codes only. The camera runs only while this screen is focused
 * (one preview at a time), and stops reporting after the first code until resumed. Until the
 * camera is allowed it shows Muvo's own explanation; the OS prompt never opens by itself (D-76).
 */
export function QrScanner({ onScanned, isPaused, onDismiss }: QrScannerProps) {
  const { t } = useTranslation();
  const [permission, requestPermission, refreshPermission] = useCameraPermissions();
  const isGranted = permission?.granted === true;
  const [isFocused, setIsFocused] = useState(false);
  const isHandling = useRef(false);

  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      return () => setIsFocused(false);
    }, []),
  );

  // The user may allow the camera in the phone's settings and come back: read it again then.
  useEffect(() => {
    if (isGranted) return;
    const subscription = AppState.addEventListener('change', (next) => {
      if (next !== 'active') return;
      refreshPermission().catch((error: unknown) =>
        logger.warn('Reading the camera permission failed', { error }),
      );
    });
    return () => subscription.remove();
  }, [isGranted, refreshPermission]);

  const ask = useCallback(() => {
    requestPermission().catch((error: unknown) =>
      logger.warn('The camera permission prompt failed', { error }),
    );
  }, [requestPermission]);

  const openSettings = useCallback(() => {
    Linking.openSettings().catch((error: unknown) =>
      logger.warn('Opening the phone settings failed', { error }),
    );
  }, []);

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
      <CameraConsent
        canAskAgain={permission.canAskAgain}
        onContinue={ask}
        onOpenSettings={openSettings}
        onDismiss={onDismiss}
      />
    );
  }
  return (
    <View
      className="flex-1 overflow-hidden rounded-card bg-surface-muted"
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
