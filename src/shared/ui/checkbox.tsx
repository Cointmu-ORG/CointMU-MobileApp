import Check from 'lucide-react-native/icons/check';
import { View } from 'react-native';

import { PressableSurface, SURFACE_PALETTE } from './pressable-surface';
import { Text } from './text';
import { colors } from './theme/colors';

const CHECK_SIZE = 16;

type CheckboxProps = {
  label: string;
  isChecked: boolean;
  onToggle: () => void;
};

export function Checkbox({ label, isChecked, onToggle }: CheckboxProps) {
  return (
    <PressableSurface
      palette={SURFACE_PALETTE.ghost}
      className="-mx-2 min-h-11 flex-row items-center gap-3 rounded-lg px-2 py-2"
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked: isChecked }}
    >
      <View
        className={`h-6 w-6 items-center justify-center rounded-md border-2 ${
          isChecked
            ? 'border-primary-600 bg-primary-600'
            : 'border-content-secondary bg-surface-card'
        }`}
      >
        {isChecked ? <Check size={CHECK_SIZE} color={colors.content.inverse} /> : null}
      </View>
      <Text variant="label" className="flex-1">
        {label}
      </Text>
    </PressableSurface>
  );
}
