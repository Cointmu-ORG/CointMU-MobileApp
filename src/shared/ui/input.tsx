import { useState, type ComponentProps } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';
import Animated from 'react-native-reanimated';

import { Text } from './text';
import { colors } from './theme/colors';

export type InputStatus = 'default' | 'success' | 'error';

const BORDER_CLASS: Record<InputStatus, string> = {
  default: 'border-border',
  success: 'border-success',
  error: 'border-danger',
};

type InputProps = Omit<TextInputProps, 'className'> & {
  label: string;
  status?: InputStatus;
  /** Shown under the field and announced to screen readers. */
  message?: string;
  /** Animated style from the caller, e.g. useShake(). */
  animatedStyle?: ComponentProps<typeof Animated.View>['style'];
};

export function Input({ label, status = 'default', message, animatedStyle, ...props }: InputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const borderClass =
    status === 'default' && isFocused ? 'border-border-active' : BORDER_CLASS[status];

  return (
    <View className="gap-2">
      <Text variant="label" tone="secondary">
        {label}
      </Text>
      <Animated.View style={animatedStyle}>
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={colors.content.muted}
          className={`min-h-14 rounded-control border bg-surface-card px-4 py-3 text-base text-content ${borderClass}`}
          {...props}
          onFocus={(event) => {
            setIsFocused(true);
            props.onFocus?.(event);
          }}
          onBlur={(event) => {
            setIsFocused(false);
            props.onBlur?.(event);
          }}
        />
      </Animated.View>
      {message ? (
        <Text
          variant="caption"
          tone={status === 'error' ? 'danger' : status === 'success' ? 'success' : 'secondary'}
          accessibilityLiveRegion="polite"
        >
          {message}
        </Text>
      ) : null}
    </View>
  );
}
