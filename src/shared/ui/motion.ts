// Reanimated animations default to ReduceMotion.System: when the OS "reduce motion" setting is
// on, they jump straight to their end state. Components rely on that default rather than
// re-implementing the check.
export const MOTION = {
  fastMs: 150,
  baseMs: 250,
  slowMs: 350,
  staggerMs: 60,
  pressedScale: 0.97,
  shakeOffsetPx: 10,
  shakeSteps: 4,
  skeletonPulseMs: 800,
  skeletonMinOpacity: 0.4,
} as const;
