import { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { MOTION } from './motion';

/** Subtle scale-down while pressed. */
export function usePressScale() {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  return {
    style,
    onPressIn: () => {
      scale.set(withTiming(MOTION.pressedScale, { duration: MOTION.fastMs }));
    },
    onPressOut: () => {
      scale.set(withTiming(1, { duration: MOTION.fastMs }));
    },
  };
}
