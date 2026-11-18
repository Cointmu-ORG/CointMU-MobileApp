import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';

import { Text, useIsMotionReduced, useThemeColors } from '@/shared/ui';

import { isSuccessPhase, type SendPhase } from '../lib/send-phase';
import { useSendFlowStore } from '../model/send-flow-store';
import { PHASE_VIEW } from './phase-view';

const CIRCLE_SIZE = 72;
const ICON_SIZE = 32;
const HALO_PULSE_MS = 1_600;
const HALO_MAX_SCALE = 1.35;
const HALO_START_OPACITY = 0.35;
const POP_DAMPING = 14;

/** A soft ring that breathes out of the circle while the outcome is open. Off under reduced motion. */
function Halo({ color }: { color: string }) {
  const isReduced = useIsMotionReduced();
  const pulse = useSharedValue(0);
  const style = useAnimatedStyle(() => ({
    opacity: HALO_START_OPACITY * (1 - pulse.get()),
    transform: [{ scale: 1 + (HALO_MAX_SCALE - 1) * pulse.get() }],
  }));

  useEffect(() => {
    if (isReduced) return;
    pulse.set(
      withRepeat(withTiming(1, { duration: HALO_PULSE_MS, easing: Easing.out(Easing.quad) }), -1),
    );
    return () => cancelAnimation(pulse);
  }, [isReduced, pulse]);

  if (isReduced) return null;
  return (
    <Animated.View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.halo, { backgroundColor: color }, style]}
    />
  );
}

/** The error of a send that never reached the network, in plain words. */
function useNotSentBody(): string {
  const { t } = useTranslation();
  const outcome = useSendFlowStore((state) => state.outcome);
  return t(`send.errors.${outcome && !outcome.ok ? outcome.error : 'unknown'}`);
}

/**
 * Top of the receipt: an icon in a soft circle and one short sentence. While the outcome is open
 * a halo breathes around it; when the phase changes the icon pops in (a spring, skipped under
 * reduced motion), so the moment the transfer is confirmed is felt, not only read.
 */
export function StatusHero({ phase }: { phase: SendPhase }) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const stage = useSendFlowStore((state) => state.stage);
  const notSentBody = useNotSentBody();
  const { Icon, color, circleClass, isWaiting, titleKey, bodyKey } = PHASE_VIEW[phase];
  const tint = color(colors);
  const title = titleKey === null ? t(`send.stage.${stage ?? 'checkingNetwork'}`) : t(titleKey);

  return (
    <View className="items-center gap-3">
      <View style={styles.box}>
        {isWaiting ? <Halo color={tint} /> : null}
        <Animated.View
          key={phase}
          entering={ZoomIn.springify().damping(POP_DAMPING)}
          testID={isSuccessPhase(phase) ? 'send-success-mark' : 'send-status-mark'}
          style={styles.circle}
        >
          <View className={`flex-1 items-center justify-center rounded-full ${circleClass}`}>
            <Icon size={ICON_SIZE} color={tint} />
          </View>
        </Animated.View>
      </View>
      <Text variant="heading" accessibilityRole="header" className="text-center">
        {title}
      </Text>
      <Text tone="secondary" className="text-center" accessibilityLiveRegion="polite">
        {bodyKey === null ? notSentBody : t(bodyKey)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { width: CIRCLE_SIZE, height: CIRCLE_SIZE },
  circle: { width: CIRCLE_SIZE, height: CIRCLE_SIZE },
  halo: {
    position: 'absolute',
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
  },
});
