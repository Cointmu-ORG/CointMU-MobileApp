import * as Haptics from 'expo-haptics';
import { useState, type ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated from 'react-native-reanimated';

import { useThemeColors } from './theme/theme-root';
import { usePressScale } from './use-press-scale';

/**
 * Color classes for each interaction state. Exactly one is applied at a time: NativeWind
 * resolves conflicting classes by CSS order, not by their order in the string.
 */
export type SurfacePalette = {
  readonly idle: string;
  readonly hovered: string;
  readonly pressed: string;
};

export const SURFACE_PALETTE = {
  primary: { idle: 'bg-primary-600', hovered: 'bg-primary-700', pressed: 'bg-primary-800' },
  secondary: {
    idle: 'border border-border bg-surface-card',
    hovered: 'border border-primary-200 bg-primary-50',
    pressed: 'border border-primary-300 bg-primary-100',
  },
  ghost: { idle: 'bg-transparent', hovered: 'bg-primary-50', pressed: 'bg-primary-100' },
  danger: { idle: 'bg-danger-solid', hovered: 'bg-danger-pressed', pressed: 'bg-danger-pressed' },
  /** List rows and other content on a card. */
  row: { idle: 'bg-surface-card', hovered: 'bg-surface', pressed: 'bg-surface-muted' },
  /** Keys and chips that sit on the screen background. */
  key: { idle: 'bg-surface-card', hovered: 'bg-primary-50', pressed: 'bg-primary-100' },
  quiet: { idle: 'bg-surface-muted', hovered: 'bg-primary-50', pressed: 'bg-primary-100' },
} as const satisfies Record<string, SurfacePalette>;

export type PressableSurfaceProps = Omit<PressableProps, 'children' | 'style' | 'disabled'> & {
  children: ReactNode;
  palette: SurfacePalette;
  /** Shape and layout of the visible surface (size, radius, padding). No colors. */
  className?: string;
  /** Runtime-computed size of the surface (e.g. keys scaled to the screen). No colors. */
  surfaceStyle?: StyleProp<ViewStyle>;
  /** Layout of the touch area itself, e.g. `flex-1`. */
  containerClassName?: string;
  isDisabled?: boolean;
  /** Blocks presses without dimming, e.g. while a button shows its spinner. */
  isBusy?: boolean;
};

/**
 * The one press-feedback primitive (pressed, hovered, focus-visible, disabled), so every
 * tappable thing behaves the same. Pressed: darker palette color, scale (skipped under reduce
 * motion) and a light haptic. Hovered applies on pointer devices. A focus ring shows only while
 * the control has keyboard or switch-access focus; touch never focuses a Pressable.
 */
export function PressableSurface({
  children,
  palette,
  className = '',
  surfaceStyle,
  containerClassName = '',
  isDisabled = false,
  isBusy = false,
  accessibilityState,
  onPressIn,
  onPressOut,
  onHoverIn,
  onHoverOut,
  onFocus,
  onBlur,
  ...props
}: PressableSurfaceProps) {
  const press = usePressScale();
  const colors = useThemeColors();
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  return (
    <Pressable
      className={containerClassName}
      disabled={isDisabled || isBusy}
      accessibilityState={{ ...accessibilityState, disabled: isDisabled || isBusy, busy: isBusy }}
      onPressIn={(event) => {
        press.onPressIn();
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        press.onPressOut();
        onPressOut?.(event);
      }}
      onHoverIn={(event) => {
        setIsHovered(true);
        onHoverIn?.(event);
      }}
      onHoverOut={(event) => {
        setIsHovered(false);
        onHoverOut?.(event);
      }}
      onFocus={(event) => {
        setIsFocused(true);
        onFocus?.(event);
      }}
      onBlur={(event) => {
        setIsFocused(false);
        onBlur?.(event);
      }}
      {...props}
    >
      {({ pressed }) => (
        <Animated.View style={press.style}>
          <View
            className={`${className} ${
              pressed ? palette.pressed : isHovered ? palette.hovered : palette.idle
            } ${isDisabled ? 'opacity-50' : ''}`}
            // Outline does not take part in layout, so focus never shifts content.
            style={
              isFocused
                ? StyleSheet.flatten([
                    surfaceStyle,
                    styles.focusRing,
                    { outlineColor: colors.primary[500] },
                  ])
                : surfaceStyle
            }
          >
            {children}
          </View>
        </Animated.View>
      )}
    </Pressable>
  );
}

const FOCUS_RING_WIDTH = 2;

const styles = StyleSheet.create({
  focusRing: {
    outlineWidth: FOCUS_RING_WIDTH,
    outlineOffset: FOCUS_RING_WIDTH,
    outlineStyle: 'solid',
  },
});
