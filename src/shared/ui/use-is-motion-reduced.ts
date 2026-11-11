import { useReducedMotion } from 'react-native-reanimated';

import { useAppearanceStore } from '../model/appearance-store';

/**
 * True when motion must be skipped: the device asks for reduced motion, or the user chose
 * "Reduced" in Settings > Appearance. Reanimated animations get the same answer through
 * `ReducedMotionConfig` at the root; this hook is for code that branches on it.
 */
export function useIsMotionReduced(): boolean {
  const isSystemReduced = useReducedMotion();
  const preference = useAppearanceStore((state) => state.motion);
  return isSystemReduced || preference === 'reduced';
}
