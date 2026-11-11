import ChevronRight from 'lucide-react-native/icons/chevron-right';
import type { LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { View, type AccessibilityRole, type AccessibilityState } from 'react-native';

import type { Density } from '../model/appearance-prefs';
import { useAppearanceStore } from '../model/appearance-store';
import { PressableSurface, SURFACE_PALETTE } from './pressable-surface';
import { Text } from './text';
import { useThemeColors } from './theme/theme-root';
import { ICON_SIZE } from './theme/icon-size';

type ListRowProps = {
  title: string;
  description?: string;
  /** Short current value on the right, e.g. the selected language. */
  value?: string;
  icon?: LucideIcon;
  /** Replaces the icon tile, e.g. a radio mark. */
  leading?: ReactNode;
  /** Replaces the chevron, e.g. a switch or a status. */
  trailing?: ReactNode;
  onPress?: () => void;
  isDestructive?: boolean;
  isDisabled?: boolean;
  accessibilityRole?: AccessibilityRole;
  accessibilityState?: AccessibilityState;
  accessibilityHint?: string;
};

function IconTile({ Icon, isDestructive }: { Icon: LucideIcon; isDestructive: boolean }) {
  const colors = useThemeColors();
  return (
    <View
      className={`h-9 w-9 items-center justify-center rounded-lg ${
        isDestructive ? 'bg-danger-soft' : 'bg-primary-50'
      }`}
    >
      <Icon
        size={ICON_SIZE.md}
        color={isDestructive ? colors.danger.strong : colors.accent.DEFAULT}
      />
    </View>
  );
}

function RowBody({
  title,
  description,
  value,
  icon,
  leading,
  trailing,
  onPress,
  isDestructive = false,
}: ListRowProps) {
  const colors = useThemeColors();
  const hasChevron = onPress !== undefined && trailing === undefined;
  return (
    <>
      {leading ?? (icon ? <IconTile Icon={icon} isDestructive={isDestructive} /> : null)}
      <View className="flex-1 gap-0.5">
        <Text variant="label" tone={isDestructive ? 'danger' : 'default'}>
          {title}
        </Text>
        {description ? (
          <Text variant="caption" tone="secondary">
            {description}
          </Text>
        ) : null}
      </View>
      {value ? (
        <Text variant="label" tone="secondary" numberOfLines={1} className="max-w-[45%]">
          {value}
        </Text>
      ) : null}
      {trailing}
      {hasChevron ? <ChevronRight size={ICON_SIZE.md} color={colors.content.secondary} /> : null}
    </>
  );
}

// Compact keeps the 44 dp touch target; only the padding around the content shrinks.
const ROW_CLASS: Record<Density, string> = {
  comfortable: 'min-h-14 flex-row items-center gap-3 px-4 py-3',
  compact: 'min-h-11 flex-row items-center gap-3 px-4 py-1.5',
};

/** One settings-style row. Tappable when `onPress` is given, with the shared press feedback. */
export function ListRow(props: ListRowProps) {
  const { title, value, onPress, isDisabled, accessibilityRole, accessibilityState } = props;
  const rowClass = ROW_CLASS[useAppearanceStore((state) => state.density)];
  if (onPress === undefined) {
    return (
      <View className={`${rowClass} bg-surface-card`}>
        <RowBody {...props} />
      </View>
    );
  }
  return (
    <PressableSurface
      palette={SURFACE_PALETTE.row}
      className={rowClass}
      onPress={onPress}
      isDisabled={isDisabled}
      accessibilityRole={accessibilityRole ?? 'button'}
      accessibilityLabel={value ? `${title}, ${value}` : title}
      accessibilityHint={props.accessibilityHint ?? props.description}
      accessibilityState={accessibilityState}
    >
      <RowBody {...props} />
    </PressableSurface>
  );
}
