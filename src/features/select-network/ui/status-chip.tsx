import type { LucideIcon } from 'lucide-react-native';
import { View } from 'react-native';

import { ICON_SIZE, Text, useThemeColors, type TextTone, type ThemeColors } from '@/shared/ui';

export type ChipTone = 'success' | 'warning' | 'danger' | 'neutral' | 'accent';

const TONE: Record<
  ChipTone,
  { box: string; text: TextTone; icon: (colors: ThemeColors) => string }
> = {
  success: { box: 'bg-success-soft', text: 'success', icon: (c) => c.success.strong },
  warning: { box: 'bg-warning-soft', text: 'warning', icon: (c) => c.warning.strong },
  danger: { box: 'bg-danger-soft', text: 'danger', icon: (c) => c.danger.strong },
  neutral: { box: 'bg-surface-muted', text: 'secondary', icon: (c) => c.content.secondary },
  accent: { box: 'bg-primary-50', text: 'primary', icon: (c) => c.accent.DEFAULT },
};

type StatusChipProps = { icon: LucideIcon; label: string; tone: ChipTone };

/** One fact about a node. Icon and text carry the meaning; the color only supports it. */
export function StatusChip({ icon: Icon, label, tone }: StatusChipProps) {
  const colors = useThemeColors();
  const { box, text, icon } = TONE[tone];
  return (
    <View className={`flex-row items-center gap-1 rounded-full px-2 py-1 ${box}`}>
      <Icon size={ICON_SIZE.sm} color={icon(colors)} accessibilityElementsHidden />
      <Text variant="caption" tone={text}>
        {label}
      </Text>
    </View>
  );
}
