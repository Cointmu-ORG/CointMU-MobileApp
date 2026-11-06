import ChevronRight from 'lucide-react-native/icons/chevron-right';
import type { LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { View, type AccessibilityRole, type AccessibilityState } from 'react-native';

import { PressableSurface, SURFACE_PALETTE } from './pressable-surface';
import { Text } from './text';
import { colors } from './theme/colors';

export const ICON_SIZE = { sm: 16, md: 20, lg: 24 } as const;

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
  return (
    <View
      className={`h-9 w-9 items-center justify-center rounded-lg ${
        isDestructive ? 'bg-danger-soft' : 'bg-primary-50'
      }`}
    >
      <Icon
        size={ICON_SIZE.md}
        color={isDestructive ? colors.danger.strong : colors.primary[600]}
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

const ROW_CLASS = 'min-h-14 flex-row items-center gap-3 px-4 py-3';

/** One settings-style row. Tappable when `onPress` is given, with the shared press feedback. */
export function ListRow(props: ListRowProps) {
  const { title, value, onPress, isDisabled, accessibilityRole, accessibilityState } = props;
  if (onPress === undefined) {
    return (
      <View className={`${ROW_CLASS} bg-surface-card`}>
        <RowBody {...props} />
      </View>
    );
  }
  return (
    <PressableSurface
      palette={SURFACE_PALETTE.row}
      className={ROW_CLASS}
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
