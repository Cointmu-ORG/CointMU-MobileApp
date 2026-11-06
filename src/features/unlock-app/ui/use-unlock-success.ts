import { useCallback } from 'react';
import { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { MOTION } from '@/shared/ui';

const SUCCESS_SCALE = 1.04;

/** Quick scale-and-fade on the lock screen, then hands over to the app. */
export function useUnlockSuccess() {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const style = useAnimatedStyle(() => ({
    opacity: opacity.get(),
    transform: [{ scale: scale.get() }],
  }));

  const play = useCallback(
    (onDone: () => void) => {
      scale.set(withTiming(SUCCESS_SCALE, { duration: MOTION.baseMs }));
      opacity.set(withTiming(0, { duration: MOTION.baseMs }));
      setTimeout(onDone, MOTION.baseMs);
    },
    [scale, opacity],
  );

  return { style, play };
}
