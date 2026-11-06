import { router } from 'expo-router';
import ArrowDownLeft from 'lucide-react-native/icons/arrow-down-left';
import ArrowUpRight from 'lucide-react-native/icons/arrow-up-right';
import ScanLine from 'lucide-react-native/icons/scan-line';
import type { LucideIcon } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ROUTES, type AppRoute } from '@/shared/config';
import { colors, MOTION, Text, usePressScale } from '@/shared/ui';

const ICON_SIZE = 22;

const ACTIONS: readonly { key: string; route: AppRoute; Icon: LucideIcon }[] = [
  { key: 'send', route: ROUTES.send, Icon: ArrowUpRight },
  { key: 'receive', route: ROUTES.receive, Icon: ArrowDownLeft },
  { key: 'scan', route: ROUTES.scan, Icon: ScanLine },
];

function QuickAction({ label, route, Icon }: { label: string; route: AppRoute; Icon: LucideIcon }) {
  const press = usePressScale();
  return (
    <Animated.View style={press.style}>
      <Pressable
        onPress={() => router.push(route)}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <View className="items-center gap-2">
          <View className="h-14 w-14 items-center justify-center rounded-full bg-primary-600 shadow-sm shadow-primary-200">
            <Icon size={ICON_SIZE} color={colors.content.inverse} />
          </View>
          <Text variant="label">{label}</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export function QuickActions({ enterIndex }: { enterIndex: number }) {
  const { t } = useTranslation();
  return (
    <Animated.View
      entering={FadeInDown.delay(enterIndex * MOTION.staggerMs).duration(MOTION.baseMs)}
    >
      <View className="flex-row justify-around py-2">
        {ACTIONS.map(({ key, route, Icon }) => (
          <QuickAction key={key} label={t(`home.actions.${key}`)} route={route} Icon={Icon} />
        ))}
      </View>
    </Animated.View>
  );
}
