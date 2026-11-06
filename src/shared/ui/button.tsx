import type { ReactNode } from 'react';
import { ActivityIndicator } from 'react-native';

import { PressableSurface, SURFACE_PALETTE } from './pressable-surface';
import { Text, type TextTone } from './text';
import { colors } from './theme/colors';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

const LABEL_TONE: Record<ButtonVariant, TextTone> = {
  primary: 'inverse',
  secondary: 'primary',
  ghost: 'primary',
  danger: 'inverse',
};

const SPINNER_COLOR: Record<ButtonVariant, string> = {
  primary: colors.content.inverse,
  secondary: colors.primary[600],
  ghost: colors.primary[600],
  danger: colors.content.inverse,
};

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
  return (
    <PressableSurface
      palette={SURFACE_PALETTE[variant]}
      className="h-14 flex-row items-center justify-center gap-2 rounded-control px-6"
      onPress={onPress}
      isDisabled={isDisabled}
      isBusy={isLoading}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
    >
      {isLoading ? (
        <ActivityIndicator color={SPINNER_COLOR[variant]} />
      ) : (
        <>
          {icon}
          <Text variant="button" tone={LABEL_TONE[variant]}>
            {label}
          </Text>
        </>
      )}
    </PressableSurface>
  );
}
