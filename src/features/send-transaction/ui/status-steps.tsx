import Check from 'lucide-react-native/icons/check';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { ICON_SIZE, Text, useThemeColors } from '@/shared/ui';

import type { StepState } from '../lib/send-phase';

const STEP_KEYS = ['sent', 'confirmed', 'final'] as const;
const DOT_SIZE = 24;
const CURRENT_CORE_SIZE = 8;
const LINE_HEIGHT = 2;

const A11Y_KEY: Record<StepState, string> = {
  done: 'send.receipt.stepDone',
  current: 'send.receipt.stepCurrent',
  waiting: 'send.receipt.stepWaiting',
};

/** Done: a filled dot with a check. Current: a ring with a core. Waiting: an empty ring. */
function StepDot({ state }: { state: StepState }) {
  const colors = useThemeColors();
  if (state === 'done') {
    return (
      <View style={[styles.dot, { backgroundColor: colors.accent.DEFAULT }]}>
        <Check size={ICON_SIZE.sm} color={colors.content.inverse} />
      </View>
    );
  }
  const ring = state === 'current' ? colors.accent.DEFAULT : colors.border.strong;
  return (
    <View style={[styles.dot, styles.ring, { borderColor: ring }]}>
      {state === 'current' ? (
        <View style={[styles.core, { backgroundColor: colors.accent.DEFAULT }]} />
      ) : null}
    </View>
  );
}

/**
 * Sent → Confirmed → Completed, left to right, in words and without numbers (the "n of 12"
 * count is in Technical details). Every state has its own shape, never color alone. The steps
 * use the accent, not the success color: success styling waits for the confirmation (D-81).
 */
export function StatusSteps({ states }: { states: readonly [StepState, StepState, StepState] }) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const lineColor = (isReached: boolean) =>
    isReached ? colors.accent.DEFAULT : colors.border.DEFAULT;

  return (
    <View className="flex-row">
      {STEP_KEYS.map((key, position) => {
        const state = states[position] ?? 'waiting';
        const label = t(`send.receipt.steps.${key}`);
        const isFirst = position === 0;
        const isLast = position === STEP_KEYS.length - 1;
        // The line into a step is reached when that step has started.
        const isReached = state !== 'waiting';
        const isNextReached = !isLast && (states[position + 1] ?? 'waiting') !== 'waiting';
        return (
          <View
            key={key}
            className="flex-1 items-center gap-2"
            accessible
            accessibilityLabel={t(A11Y_KEY[state], { step: label })}
          >
            <View className="flex-row items-center self-stretch">
              <View
                style={[
                  styles.line,
                  { backgroundColor: isFirst ? 'transparent' : lineColor(isReached) },
                ]}
              />
              <StepDot state={state} />
              <View
                style={[
                  styles.line,
                  { backgroundColor: isLast ? 'transparent' : lineColor(isNextReached) },
                ]}
              />
            </View>
            <Text
              variant="caption"
              tone={state === 'waiting' ? 'secondary' : 'default'}
              className="text-center"
            >
              {label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: { borderWidth: LINE_HEIGHT },
  core: {
    width: CURRENT_CORE_SIZE,
    height: CURRENT_CORE_SIZE,
    borderRadius: CURRENT_CORE_SIZE / 2,
  },
  line: { flex: 1, height: LINE_HEIGHT },
});
