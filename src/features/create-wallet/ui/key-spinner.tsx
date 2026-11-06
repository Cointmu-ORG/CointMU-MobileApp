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

/**
 * Indeterminate progress. Runs on the UI thread, so it keeps turning while key derivation blocks
 * the JS thread. Static under reduce motion.
 */
export function KeySpinner() {
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
    <Animated.View style={style} accessibilityRole="progressbar">
      <View className="h-16 w-16 rounded-full border-4 border-primary-100 border-t-primary-600" />
    </Animated.View>
  );
}
