import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { logger } from '@/shared/lib';
import { BrandMark, colors, MOTION } from '@/shared/ui';

// Same image, size and background as the native splash (expo-splash-screen in app.json), so the
// swap from native to JS is invisible; then this copy zooms out of the way.
const SPLASH_IMAGE_WIDTH = 120;
const EXIT_SCALE = 1.15;

/** Call once at module scope, before the first render, so the native splash stays up. */
export function holdNativeSplash(): void {
  SplashScreen.preventAutoHideAsync().catch((error: unknown) =>
    logger.warn('Holding the splash screen failed', { error }),
  );
}

/**
 * Rendered on top of the app once bootstrap is done: hides the native splash (the app is already
 * laid out underneath) and fades this copy out. Under reduce motion it is removed at once.
 */
export function SplashHandoff() {
  const isReducedMotion = useReducedMotion();
  const [isDone, setIsDone] = useState(false);
  const progress = useSharedValue(0);
  const style = useAnimatedStyle(() => ({
    opacity: 1 - progress.get(),
    transform: [{ scale: 1 + (EXIT_SCALE - 1) * progress.get() }],
  }));

  useEffect(() => {
    SplashScreen.hide();
    if (isReducedMotion) return;
    progress.set(withTiming(1, { duration: MOTION.slowMs, easing: Easing.out(Easing.cubic) }));
    const timer = setTimeout(() => setIsDone(true), MOTION.slowMs);
    return () => clearTimeout(timer);
  }, [isReducedMotion, progress]);

  if (isDone || isReducedMotion) return null;
  return (
    <Animated.View
      style={[styles.overlay, style]}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <BrandMark size={SPLASH_IMAGE_WIDTH} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface.DEFAULT,
  },
});
