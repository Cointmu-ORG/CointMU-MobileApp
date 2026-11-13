import { router } from 'expo-router';
import ArrowUpRight from 'lucide-react-native/icons/arrow-up-right';
import ScanLine from 'lucide-react-native/icons/scan-line';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ROUTES } from '@/shared/config';
import { Button, ICON_SIZE, MOTION, useThemeColors } from '@/shared/ui';

/**
 * The two things Home is for: Transfer and Scan QR. Both end in the send form, where the
 * source account is chosen. Receiving belongs to one account and lives on its screen.
 */
export function QuickActions({ enterIndex }: { enterIndex: number }) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  return (
    <Animated.View
      entering={FadeInDown.delay(enterIndex * MOTION.staggerMs).duration(MOTION.baseMs)}
    >
      <View className="flex-row gap-3">
        <View className="flex-1">
          <Button
            label={t('home.actions.transfer')}
            icon={<ArrowUpRight size={ICON_SIZE.md} color={colors.content.inverse} />}
            onPress={() => router.push(ROUTES.send)}
          />
        </View>
        <View className="flex-1">
          <Button
            variant="secondary"
            label={t('home.actions.scanQr')}
            icon={<ScanLine size={ICON_SIZE.md} color={colors.accent.DEFAULT} />}
            onPress={() => router.push(ROUTES.scan)}
          />
        </View>
      </View>
    </Animated.View>
  );
}
