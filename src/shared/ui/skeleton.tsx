import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { MOTION } from './motion';

type SkeletonProps = {
  /** Size and shape classes, e.g. "h-10 w-40 rounded-lg". */
  className: string;
};

const REPEAT_FOREVER = -1;

/** Pulsing placeholder while data loads. Static when reduce motion is on. */
export function Skeleton({ className }: SkeletonProps) {
  const opacity = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ opacity: opacity.get() }));

  useEffect(() => {
    opacity.set(
      withRepeat(
        withTiming(MOTION.skeletonMinOpacity, { duration: MOTION.skeletonPulseMs }),
        REPEAT_FOREVER,
        true,
      ),
    );
  }, [opacity]);

  return (
    <Animated.View style={style} accessibilityElementsHidden importantForAccessibility="no">
      <View className={`bg-surface-muted ${className}`} />
    </Animated.View>
  );
}
