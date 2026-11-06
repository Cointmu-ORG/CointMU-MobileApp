import {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { MOTION } from './motion';

const STEP_MS = MOTION.fastMs / 2;

/** Horizontal shake used for wrong input (PIN, quiz). */
export function useShake() {
  const offset = useSharedValue(0);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: offset.get() }] }));

  const shake = () => {
    const swings = Array.from({ length: MOTION.shakeSteps }, (_, step) =>
      withTiming(step % 2 === 0 ? MOTION.shakeOffsetPx : -MOTION.shakeOffsetPx, {
        duration: STEP_MS,
      }),
    );
    offset.set(withSequence(...swings, withTiming(0, { duration: STEP_MS })));
  };

  return { style, shake };
}
