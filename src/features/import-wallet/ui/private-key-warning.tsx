import TriangleAlert from 'lucide-react-native/icons/triangle-alert';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Checkbox, MOTION, Text, useThemeColors } from '@/shared/ui';

const ICON_SIZE = 20;

type PrivateKeyWarningProps = {
  isAcknowledged: boolean;
  onToggle: () => void;
};

/** D-28: mandatory "back up your key" warning for private-key imports. */
export function PrivateKeyWarning({ isAcknowledged, onToggle }: PrivateKeyWarningProps) {
  const colors = useThemeColors();
  const { t } = useTranslation();
  return (
    <Animated.View entering={FadeIn.duration(MOTION.baseMs)}>
      <View className="gap-3 rounded-card border border-warning bg-warning-soft p-4">
        <View className="flex-row items-center gap-2">
          <TriangleAlert size={ICON_SIZE} color={colors.warning.strong} />
          <Text variant="label">{t('onboarding.import.privateKeyWarningTitle')}</Text>
        </View>
        <Text variant="caption" tone="default">
          {t('onboarding.import.privateKeyWarningBody')}
        </Text>
        <Checkbox
          label={t('onboarding.import.privateKeyAck')}
          isChecked={isAcknowledged}
          onToggle={onToggle}
        />
      </View>
    </Animated.View>
  );
}
