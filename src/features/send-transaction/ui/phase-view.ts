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
  /** Soft fill of the circle behind the icon. */
  readonly circleClass: string;
  /** The halo pulses while the outcome is still open; never once it is settled. */
  readonly isWaiting: boolean;
  /** Null for `sending`, whose title is the current stage. */
  readonly titleKey: string | null;
  /** Null where the body is the send error, chosen by the screen. */
  readonly bodyKey: string | null;
};

const accent = (colors: ThemeColors) => colors.accent.DEFAULT;
const success = (colors: ThemeColors) => colors.success.strong;
const danger = (colors: ThemeColors) => colors.danger.strong;
const warning = (colors: ThemeColors) => colors.warning.strong;
const neutral = (colors: ThemeColors) => colors.content.secondary;

/**
 * Icon, color and words of the receipt's hero for each phase. Only `confirmed` and `final` use
 * the success color and a check mark (D-81). The body of a settled transfer is the same
 * one-line explanation the transaction detail shows (`tx.statusHelp`), so both screens match.
 */
export const PHASE_VIEW: Record<SendPhase, PhaseView> = {
  sending: {
    Icon: Send,
    color: accent,
    circleClass: 'bg-primary-50',
    isWaiting: true,
    titleKey: null,
    bodyKey: 'send.receipt.sendingBody',
  },
  notSent: {
    Icon: CircleX,
    color: danger,
    circleClass: 'bg-danger-soft',
    isWaiting: false,
    titleKey: 'send.receipt.title.notSent',
    bodyKey: null,
  },
  broadcast: {
    Icon: Send,
    color: accent,
    circleClass: 'bg-primary-50',
    isWaiting: true,
    titleKey: 'send.receipt.title.broadcast',
    bodyKey: 'tx.statusHelp.pending',
  },
  uncertain: {
    Icon: Clock,
    color: warning,
    circleClass: 'bg-warning-soft',
    isWaiting: true,
    titleKey: 'send.receipt.title.uncertain',
    bodyKey: 'send.receipt.uncertainBody',
  },
  confirmed: {
    Icon: Check,
    color: success,
    circleClass: 'bg-success-soft',
    isWaiting: false,
    titleKey: 'send.receipt.title.confirmed',
    bodyKey: 'tx.statusHelp.confirmed',
  },
  final: {
    Icon: CheckCheck,
    color: success,
    circleClass: 'bg-success-soft',
    isWaiting: false,
    titleKey: 'send.receipt.title.final',
    bodyKey: 'tx.statusHelp.final',
  },
  reverted: {
    Icon: CircleX,
    color: danger,
    circleClass: 'bg-danger-soft',
    isWaiting: false,
    titleKey: 'send.receipt.title.reverted',
    bodyKey: 'tx.statusHelp.failed',
  },
  dropped: {
    Icon: Ban,
    color: neutral,
    circleClass: 'bg-surface-muted',
    isWaiting: false,
    titleKey: 'send.receipt.title.dropped',
    bodyKey: 'tx.statusHelp.dropped',
  },
  replaced: {
    Icon: Repeat,
    color: neutral,
    circleClass: 'bg-surface-muted',
    isWaiting: false,
    titleKey: 'send.receipt.title.replaced',
    bodyKey: 'tx.statusHelp.replaced',
  },
};
