import Camera from 'lucide-react-native/icons/camera';
import ImageOff from 'lucide-react-native/icons/image-off';
import QrCode from 'lucide-react-native/icons/qr-code';
import type { LucideIcon } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Button, ICON_SIZE, Notice, Text, useThemeColors } from '@/shared/ui';

type CameraConsentProps = {
  /** False once the OS no longer shows its prompt: the only way left is the phone's settings. */
  canAskAgain: boolean;
  /** Opens the OS permission prompt. */
  onContinue: () => void;
  onOpenSettings: () => void;
  /** Leaves the scanner without asking. */
  onDismiss: () => void;
};

function Reason({ icon: Icon, children }: { icon: LucideIcon; children: string }) {
  const colors = useThemeColors();
  return (
    <View className="flex-row gap-3">
      <Icon size={ICON_SIZE.md} color={colors.accent.DEFAULT} accessibilityElementsHidden />
      <Text tone="secondary" className="flex-1">
        {children}
      </Text>
    </View>
  );
}

/**
 * Muvo's own explanation, shown before the OS camera prompt (D-76): what the camera is for and
 * that nothing is captured. The OS prompt opens only from Continue. After a permanent denial
 * the same explanation offers the phone's settings instead.
 */
export function CameraConsent(props: CameraConsentProps) {
  const { canAskAgain, onContinue, onOpenSettings, onDismiss } = props;
  const colors = useThemeColors();
  const { t } = useTranslation();
  return (
    <View className="flex-1 justify-center gap-6 px-2">
      <View className="items-center gap-4">
        <View className="h-16 w-16 items-center justify-center rounded-card bg-primary-50">
          <Camera size={ICON_SIZE.lg} color={colors.accent.DEFAULT} />
        </View>
        <Text variant="heading" accessibilityRole="header" className="text-center">
          {t('scan.permission.title')}
        </Text>
      </View>
      <View className="gap-3">
        <Reason icon={QrCode}>{t('scan.permission.why')}</Reason>
        <Reason icon={ImageOff}>{t('scan.permission.privacy')}</Reason>
      </View>
      {canAskAgain ? (
        <Text variant="caption" tone="secondary" className="text-center">
          {t('scan.permission.next')}
        </Text>
      ) : (
        <Notice tone="warning">{t('scan.permission.denied')}</Notice>
      )}
      <View className="gap-3">
        {canAskAgain ? (
          <Button label={t('scan.permission.continue')} onPress={onContinue} />
        ) : (
          <Button label={t('scan.permission.openSettings')} onPress={onOpenSettings} />
        )}
        <Button variant="ghost" label={t('scan.permission.notNow')} onPress={onDismiss} />
      </View>
    </View>
  );
}
