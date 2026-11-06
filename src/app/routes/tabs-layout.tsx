import { Tabs } from 'expo-router/js-tabs';
import History from 'lucide-react-native/icons/history';
import House from 'lucide-react-native/icons/house';
import Settings from 'lucide-react-native/icons/settings';
import type { LucideIcon } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import type { ColorValue } from 'react-native';

import { colors } from '@/shared/ui';

function tabIcon(Icon: LucideIcon) {
  function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    // The tab bar passes our string tint colors; anything else falls back to the inactive tint.
    return (
      <Icon color={typeof color === 'string' ? color : colors.content.secondary} size={size} />
    );
  }
  return TabIcon;
}

export function TabsLayout() {
  const { t } = useTranslation();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary[600],
        tabBarInactiveTintColor: colors.content.secondary,
        tabBarStyle: {
          backgroundColor: colors.surface.card,
          borderTopColor: colors.border.DEFAULT,
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('tabs.home'), tabBarIcon: tabIcon(House) }} />
      <Tabs.Screen
        name="history"
        options={{ title: t('tabs.history'), tabBarIcon: tabIcon(History) }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: t('tabs.settings'), tabBarIcon: tabIcon(Settings) }}
      />
    </Tabs>
  );
}
