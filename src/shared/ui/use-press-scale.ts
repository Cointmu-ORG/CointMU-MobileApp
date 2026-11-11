import { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { MOTION } from './motion';
import { useIsMotionReduced } from './use-is-motion-reduced';

/**
 * Subtle scale-down while pressed. With reduce motion on there is no scale at all; the pressed
 * color change carries the feedback instead.
 */
export function usePressScale() {
  const isReducedMotion = useIsMotionReduced();
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  return {
    style,
    onPressIn: () => {
      if (isReducedMotion) return;
      scale.set(withTiming(MOTION.pressedScale, { duration: MOTION.fastMs }));
    },
    onPressOut: () => {
      scale.set(withTiming(1, { duration: MOTION.fastMs }));
    },
  };
}
