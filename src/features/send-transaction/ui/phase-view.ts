import Ban from 'lucide-react-native/icons/ban';
import Check from 'lucide-react-native/icons/check';
import CheckCheck from 'lucide-react-native/icons/check-check';
import CircleX from 'lucide-react-native/icons/circle-x';
import Clock from 'lucide-react-native/icons/clock';
import Repeat from 'lucide-react-native/icons/repeat';
import Send from 'lucide-react-native/icons/send';
import type { LucideIcon } from 'lucide-react-native';

import type { ThemeColors } from '@/shared/ui';

import type { SendPhase } from '../lib/send-phase';

export type PhaseView = {
  readonly Icon: LucideIcon;
  readonly color: (colors: ThemeColors) => string;
  readonly titleKey: string;
  /** Null where the body is the send error or the stage text, chosen by the screen. */
  readonly bodyKey: string | null;
};

const accent = (colors: ThemeColors) => colors.accent.DEFAULT;
const success = (colors: ThemeColors) => colors.success.strong;
const danger = (colors: ThemeColors) => colors.danger.strong;
const warning = (colors: ThemeColors) => colors.warning.strong;
const neutral = (colors: ThemeColors) => colors.content.secondary;

/**
 * Icon, color and words for each phase after the send call returned. Only `confirmed` and
 * `final` use the success color and a check mark; `sending` has no entry because it shows the
 * spinner and the current stage.
 */
export const PHASE_VIEW: Record<Exclude<SendPhase, 'sending'>, PhaseView> = {
  notSent: { Icon: CircleX, color: danger, titleKey: 'send.result.failedTitle', bodyKey: null },
  broadcast: {
    Icon: Send,
    color: accent,
    titleKey: 'send.status.sentToNetwork',
    bodyKey: 'send.status.broadcastBody',
  },
  uncertain: {
    Icon: Clock,
    color: warning,
    titleKey: 'send.result.uncertainTitle',
    bodyKey: 'send.result.uncertainBody',
  },
  confirmed: {
    Icon: Check,
    color: success,
    titleKey: 'send.status.confirmedTitle',
    bodyKey: 'send.status.confirmedBody',
  },
  final: {
    Icon: CheckCheck,
    color: success,
    titleKey: 'send.status.finalTitle',
    bodyKey: 'send.status.finalBody',
  },
  reverted: {
    Icon: CircleX,
    color: danger,
    titleKey: 'send.status.revertedTitle',
    bodyKey: 'tx.statusHelp.failed',
  },
  dropped: {
    Icon: Ban,
    color: neutral,
    titleKey: 'send.status.droppedTitle',
    bodyKey: 'tx.statusHelp.dropped',
  },
  replaced: {
    Icon: Repeat,
    color: neutral,
    titleKey: 'send.status.replacedTitle',
    bodyKey: 'tx.statusHelp.replaced',
  },
};
