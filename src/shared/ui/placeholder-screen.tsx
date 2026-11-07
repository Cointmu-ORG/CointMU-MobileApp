import type { LucideIcon } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Screen } from './screen';
import { Text } from './text';
import { colors } from './theme/colors';
import { ICON_SIZE } from './theme/icon-size';

type PlaceholderScreenProps = {
  title: string;
  icon: LucideIcon;
};

/** Empty state for routes that exist but are not built yet. */
export function PlaceholderScreen({ title, icon: Icon }: PlaceholderScreenProps) {
  const { t } = useTranslation();
  return (
    <Screen className="items-center justify-center gap-4">
      <View className="h-16 w-16 items-center justify-center rounded-card bg-primary-50">
        <Icon size={ICON_SIZE.lg} color={colors.primary[600]} />
      </View>
      <View className="items-center gap-2">
        <Text variant="heading" accessibilityRole="header">
          {title}
        </Text>
        <Text tone="secondary" className="max-w-xs text-center">
          {t('common.comingSoon')}
        </Text>
      </View>
    </Screen>
  );
}
