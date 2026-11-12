import CircleCheck from 'lucide-react-native/icons/circle-check';
import CircleDashed from 'lucide-react-native/icons/circle-dashed';
import Hourglass from 'lucide-react-native/icons/hourglass';
import type { LucideIcon } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { ICON_SIZE, Text, type ThemeColors, useThemeColors } from '@/shared/ui';

import type { StepState } from '../lib/send-phase';

const STEP_KEYS = ['sent', 'confirmed', 'final'] as const;

const STEP_VIEW: Record<
  StepState,
  { Icon: LucideIcon; color: (colors: ThemeColors) => string; a11yKey: string }
> = {
  done: {
    Icon: CircleCheck,
    color: (colors) => colors.success.strong,
    a11yKey: 'send.status.stepDone',
  },
  current: {
    Icon: Hourglass,
    color: (colors) => colors.accent.DEFAULT,
    a11yKey: 'send.status.stepCurrent',
  },
  waiting: {
    Icon: CircleDashed,
    color: (colors) => colors.content.secondary,
    a11yKey: 'send.status.stepWaiting',
  },
};

type StatusStepsProps = {
  states: readonly [StepState, StepState, StepState];
  /** Shown next to "Confirmed" once the transaction is in a block, e.g. "3/12". */
  confirmationsText: string | null;
};

/** Sent to the network, confirmed, final: each with an icon and words, never color alone. */
export function StatusSteps({ states, confirmationsText }: StatusStepsProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();

  return (
    <View className="gap-3 rounded-card border border-border bg-surface-card p-4">
      {STEP_KEYS.map((key, position) => {
        const state = states[position] ?? 'waiting';
        const { Icon, color, a11yKey } = STEP_VIEW[state];
        const label = t(`send.status.steps.${key}`);
        const detail = key === 'confirmed' ? confirmationsText : null;
        return (
          <View
            key={key}
            className="flex-row items-center gap-3"
            accessible
            accessibilityLabel={t(a11yKey, { step: detail ? `${label} ${detail}` : label })}
          >
            <Icon size={ICON_SIZE.md} color={color(colors)} />
            <Text
              variant="label"
              tone={state === 'waiting' ? 'secondary' : 'default'}
              className="flex-1"
            >
              {label}
            </Text>
            {detail ? (
              <Text variant="label" tone="secondary">
                {detail}
              </Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}
