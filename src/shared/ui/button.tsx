import type { ReactNode } from 'react';
import { ActivityIndicator } from 'react-native';

import { PressableSurface, SURFACE_PALETTE } from './pressable-surface';
import { Text, type TextTone } from './text';
import { useThemeColors } from './theme/theme-root';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

const LABEL_TONE: Record<ButtonVariant, TextTone> = {
  primary: 'inverse',
  secondary: 'primary',
  ghost: 'primary',
  danger: 'inverse',
};

/** Variants whose label sits on a filled surface; the others show the accent on a light one. */
const IS_FILLED: Record<ButtonVariant, boolean> = {
  primary: true,
  secondary: false,
  ghost: false,
  danger: true,
};

/**
 * A disabled filled button turns into a muted, outlined surface with the normal text color:
 * plainly not the action color, and its label still meets AA (dimming it would not).
 */
const DISABLED_FILLED_CLASS = 'border border-border-strong bg-surface-muted';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  /** Shows a spinner and blocks presses, so a submit can't fire twice. */
  isLoading?: boolean;
  isDisabled?: boolean;
  icon?: ReactNode;
  accessibilityHint?: string;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  isLoading = false,
  isDisabled = false,
  icon,
  accessibilityHint,
}: ButtonProps) {
  const colors = useThemeColors();
  const isMuted = isDisabled && IS_FILLED[variant];
  return (
    <PressableSurface
      palette={SURFACE_PALETTE[variant]}
      className="h-14 flex-row items-center justify-center gap-2 rounded-control px-6"
      onPress={onPress}
      isDisabled={isDisabled}
      disabledClassName={IS_FILLED[variant] ? DISABLED_FILLED_CLASS : undefined}
      isBusy={isLoading}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
    >
      {isLoading ? (
        <ActivityIndicator
          color={IS_FILLED[variant] ? colors.content.inverse : colors.accent.DEFAULT}
        />
      ) : (
        <>
          {icon}
          <Text variant="button" tone={isMuted ? 'default' : LABEL_TONE[variant]}>
            {label}
          </Text>
        </>
      )}
    </PressableSurface>
  );
}
