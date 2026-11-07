import { View } from 'react-native';

import { PressableSurface, type SurfacePalette } from './pressable-surface';
import { Text } from './text';

export type SegmentOption<T extends string> = {
  readonly value: T;
  readonly label: string;
};

type SegmentedControlProps<T extends string> = {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Names the group for screen readers. */
  accessibilityLabel: string;
};

const SELECTED: SurfacePalette = {
  idle: 'bg-surface-card shadow-sm',
  hovered: 'bg-surface-card shadow-sm',
  pressed: 'bg-primary-50 shadow-sm',
};
const UNSELECTED: SurfacePalette = {
  idle: 'bg-transparent',
  hovered: 'bg-primary-50',
  pressed: 'bg-primary-100',
};

/** One-of-n choice shown inline (import mode, language, auto-lock timeout). */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: SegmentedControlProps<T>) {
  return (
    <View
      className="flex-row gap-1 rounded-control bg-surface-muted p-1"
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
    >
      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <PressableSurface
            key={option.value}
            containerClassName="flex-1"
            className="min-h-11 items-center justify-center rounded-lg px-2"
            palette={isSelected ? SELECTED : UNSELECTED}
            onPress={() => onChange(option.value)}
            accessibilityRole="radio"
            accessibilityLabel={option.label}
            accessibilityState={{ selected: isSelected, checked: isSelected }}
          >
            <Text
              variant="label"
              tone={isSelected ? 'primary' : 'secondary'}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {option.label}
            </Text>
          </PressableSurface>
        );
      })}
    </View>
  );
}
