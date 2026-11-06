import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Text, type TextTone } from './text';
import { colors } from './theme/colors';
import { usePressScale } from './use-press-scale';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

const CONTAINER_CLASS: Record<ButtonVariant, string> = {
  primary: 'bg-primary-600 shadow-sm shadow-primary-200',
  secondary: 'border border-border bg-surface-card',
  ghost: 'bg-transparent',
};

const LABEL_TONE: Record<ButtonVariant, TextTone> = {
  primary: 'inverse',
  secondary: 'primary',
  ghost: 'primary',
};

const SPINNER_COLOR: Record<ButtonVariant, string> = {
  primary: colors.content.inverse,
  secondary: colors.primary[600],
  ghost: colors.primary[600],
};

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  /** Shows a spinner and blocks presses, so a submit can't fire twice. */
  isLoading?: boolean;
  isDisabled?: boolean;
  icon?: ReactNode;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  isLoading = false,
  isDisabled = false,
  icon,
}: ButtonProps) {
  const press = usePressScale();
  const isInactive = isDisabled || isLoading;

  return (
    <Animated.View style={press.style}>
      <Pressable
        onPress={onPress}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        disabled={isInactive}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: isInactive, busy: isLoading }}
      >
        <View
          className={`h-14 flex-row items-center justify-center gap-2 rounded-control px-6 ${
            CONTAINER_CLASS[variant]
          } ${isDisabled ? 'opacity-50' : ''}`}
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
        </View>
      </Pressable>
    </Animated.View>
  );
}
