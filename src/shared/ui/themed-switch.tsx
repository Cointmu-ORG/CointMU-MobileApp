import { Switch } from 'react-native';

import { useThemeColors } from './theme/theme-root';

type ThemedSwitchProps = {
  value: boolean;
  onValueChange: (next: boolean) => void;
  accessibilityLabel: string;
  isDisabled?: boolean;
};

/** The native switch in the theme's colors: accent fill when on, a visible track when off. */
export function ThemedSwitch({
  value,
  onValueChange,
  accessibilityLabel,
  isDisabled = false,
}: ThemedSwitchProps) {
  const colors = useThemeColors();
  return (
    <Switch
      value={value}
      onValueChange={onValueChange}
      disabled={isDisabled}
      accessibilityLabel={accessibilityLabel}
      trackColor={{ false: colors.border.strong, true: colors.primary[600] }}
      thumbColor={colors.content.inverse}
      ios_backgroundColor={colors.border.strong}
    />
  );
}
