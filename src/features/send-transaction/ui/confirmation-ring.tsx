import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { MOTION, useThemeColors } from '@/shared/ui';

const SIZE = 104;
const STROKE = 8;
const RADIUS = (SIZE - STROKE) / 2;
const CENTER = SIZE / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
/** SVG angles start at 3 o'clock; the ring fills from the top. */
const START_ANGLE_DEG = -90;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type ConfirmationRingProps = {
  /** 0 to 1: confirmations over the number needed to be final. */
  progress: number;
  /** Stroke of the filled part. */
  color: string;
  accessibilityLabel: string;
  /** The status icon in the middle. */
  children: ReactNode;
};

/**
 * A ring that fills as confirmations arrive. The fill animates on the UI thread and, under
 * reduce motion, jumps straight to its value (Reanimated's default), so the ring is then a
 * static picture of the same number.
 */
export function ConfirmationRing({
  progress,
  color,
  accessibilityLabel,
  children,
}: ConfirmationRingProps) {
  const colors = useThemeColors();
  const filled = useSharedValue(progress);
  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE * (1 - filled.get()),
  }));

  useEffect(() => {
    filled.set(withTiming(progress, { duration: MOTION.slowMs }));
  }, [filled, progress]);

  return (
    <View
      style={styles.box}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
    >
      <Svg width={SIZE} height={SIZE}>
        <Circle
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          stroke={colors.border.DEFAULT}
          strokeWidth={STROKE}
          fill="none"
        />
        <AnimatedCircle
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          stroke={color}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          animatedProps={animatedProps}
          fill="none"
          rotation={START_ANGLE_DEG}
          origin={`${CENTER}, ${CENTER}`}
        />
      </Svg>
      <View style={styles.center}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { width: SIZE, height: SIZE, alignSelf: 'center' },
  center: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
