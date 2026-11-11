import Eye from 'lucide-react-native/icons/eye';
import EyeOff from 'lucide-react-native/icons/eye-off';

import { PressableSurface, SURFACE_PALETTE } from './pressable-surface';
import { ICON_SIZE } from './theme/icon-size';
import { useThemeColors } from './theme/theme-root';

type SecretEyeProps = {
  isRevealed: boolean;
  onToggle: () => void;
  /** Accessibility labels for the two states, e.g. "Show key" and "Hide key". */
  showLabel: string;
  hideLabel: string;
};

/** The eye next to a masked secret (recovery phrase, private key). Pair with `useTimedReveal`. */
export function SecretEye({ isRevealed, onToggle, showLabel, hideLabel }: SecretEyeProps) {
  const colors = useThemeColors();
  const Icon = isRevealed ? EyeOff : Eye;
  return (
    <PressableSurface
      palette={SURFACE_PALETTE.ghost}
      className="h-11 w-11 items-center justify-center rounded-full"
      onPress={onToggle}
      accessibilityRole="button"
      accessibilityLabel={isRevealed ? hideLabel : showLabel}
    >
      <Icon size={ICON_SIZE.md} color={colors.content.secondary} />
    </PressableSurface>
  );
}
