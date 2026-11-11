import CircleAlert from 'lucide-react-native/icons/circle-alert';
import Info from 'lucide-react-native/icons/info';
import TriangleAlert from 'lucide-react-native/icons/triangle-alert';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Text } from './text';
import type { ThemeColors } from './theme/build-theme';
import { useThemeColors } from './theme/theme-root';
import { ICON_SIZE } from './theme/icon-size';

export type NoticeTone = 'info' | 'warning' | 'danger';

const TONES = {
  info: { Icon: Info, box: 'bg-primary-50', text: 'default' },
  warning: { Icon: TriangleAlert, box: 'bg-warning-soft', text: 'default' },
  danger: { Icon: CircleAlert, box: 'bg-danger-soft', text: 'danger' },
} as const;

function iconColor(tone: NoticeTone, colors: ThemeColors): string {
  if (tone === 'info') return colors.accent.DEFAULT;
  return tone === 'warning' ? colors.warning.strong : colors.danger.strong;
}

type NoticeProps = {
  tone: NoticeTone;
  title?: string;
  children: ReactNode;
};

/**
 * A boxed message with an icon. Meaning never relies on color alone: the icon and the text
 * carry it too. Announced politely to screen readers when it appears.
 */
export function Notice({ tone, title, children }: NoticeProps) {
  const colors = useThemeColors();
  const { Icon, box, text } = TONES[tone];
  return (
    <View
      className={`flex-row gap-3 rounded-control p-4 ${box}`}
      accessibilityRole={tone === 'info' ? undefined : 'alert'}
      accessibilityLiveRegion="polite"
    >
      <Icon size={ICON_SIZE.md} color={iconColor(tone, colors)} accessibilityElementsHidden />
      <View className="flex-1 gap-1">
        {title ? (
          <Text variant="label" tone={text}>
            {title}
          </Text>
        ) : null}
        <Text variant="caption" tone={text} className="text-sm">
          {children}
        </Text>
      </View>
    </View>
  );
}
