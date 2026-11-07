import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

const FULL_TURN_DEG = 360;
const TURN_MS = 900;
const REPEAT_FOREVER = -1;

const SIZE_CLASS = {
  small: 'h-6 w-6 border-2',
  large: 'h-16 w-16 border-4',
} as const;

type SpinnerProps = {
  size?: keyof typeof SIZE_CLASS;
  /** Announced to screen readers. */
  label?: string;
};

/**
 * Indeterminate progress. Runs on the UI thread, so it keeps turning while key derivation or PIN
 * hashing blocks the JS thread. Static under reduce motion.
 */
export function Spinner({ size = 'large', label }: SpinnerProps) {
  const rotation = useSharedValue(0);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.get()}deg` }] }));

  useEffect(() => {
    rotation.set(
      withRepeat(
        withTiming(FULL_TURN_DEG, { duration: TURN_MS, easing: Easing.linear }),
        REPEAT_FOREVER,
      ),
    );
  }, [rotation]);

  return (
    <Animated.View style={style} accessibilityRole="progressbar" accessibilityLabel={label}>
      <View
        className={`rounded-full border-primary-100 border-t-primary-600 ${SIZE_CLASS[size]}`}
      />
    </Animated.View>
  );
}
