import Check from 'lucide-react-native/icons/check';
import TriangleAlert from 'lucide-react-native/icons/triangle-alert';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { colors, MOTION, Text } from '@/shared/ui';

const ICON_SIZE = 20;
const CHECK_SIZE = 16;

type PrivateKeyWarningProps = {
  isAcknowledged: boolean;
  onToggle: () => void;
};

/** D-28: mandatory "back up your key" warning for private-key imports. */
export function PrivateKeyWarning({ isAcknowledged, onToggle }: PrivateKeyWarningProps) {
  const { t } = useTranslation();
  return (
    <Animated.View entering={FadeIn.duration(MOTION.baseMs)}>
      <View className="gap-3 rounded-card border border-warning bg-warning-soft p-4">
        <View className="flex-row items-center gap-2">
          <TriangleAlert size={ICON_SIZE} color={colors.warning.DEFAULT} />
          <Text variant="label">{t('onboarding.import.privateKeyWarningTitle')}</Text>
        </View>
        <Text variant="caption" tone="secondary">
          {t('onboarding.import.privateKeyWarningBody')}
        </Text>
        <Pressable
          onPress={onToggle}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: isAcknowledged }}
          accessibilityLabel={t('onboarding.import.privateKeyAck')}
        >
          <View className="flex-row items-center gap-3 py-1">
            <View
              className={`h-6 w-6 items-center justify-center rounded-md border-2 ${
                isAcknowledged
                  ? 'border-primary-600 bg-primary-600'
                  : 'border-border bg-surface-card'
              }`}
            >
              {isAcknowledged ? <Check size={CHECK_SIZE} color={colors.content.inverse} /> : null}
            </View>
            <Text variant="label" className="flex-1">
              {t('onboarding.import.privateKeyAck')}
            </Text>
          </View>
        </Pressable>
      </View>
    </Animated.View>
  );
}
