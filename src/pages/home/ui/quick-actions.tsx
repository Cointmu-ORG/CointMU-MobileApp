import { router } from 'expo-router';
import ArrowUpRight from 'lucide-react-native/icons/arrow-up-right';
import ScanLine from 'lucide-react-native/icons/scan-line';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { switchToDefaultAccount } from '@/features/manage-accounts';
import { ROUTES, type AppRoute } from '@/shared/config';
import { Button, ICON_SIZE, MOTION, useThemeColors } from '@/shared/ui';

/** Home belongs to no single account, so a send from here starts from the default one (D-92). */
function openFromDefault(route: AppRoute) {
  switchToDefaultAccount();
  router.push(route);
}

/**
 * The two things Home is for: Transfer and Scan QR. Both end in the send form with the default
 * account as the source, which can be changed there for that send. Receiving belongs to one
 * account and lives on its screen.
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
            onPress={() => openFromDefault(ROUTES.send)}
          />
        </View>
        <View className="flex-1">
          <Button
            variant="secondary"
            label={t('home.actions.scanQr')}
            icon={<ScanLine size={ICON_SIZE.md} color={colors.accent.DEFAULT} />}
            onPress={() => openFromDefault(ROUTES.scan)}
          />
        </View>
      </View>
    </Animated.View>
  );
}
