import type { TxStatus } from '@/entities/transaction';

/**
 * What the status screen shows. Every phase comes from something that really happened: the send
 * call returning, or a status the poller read from the node. Nothing is assumed ahead of it.
 */
export type SendPhase =
  /** Checking the network, signing or broadcasting. Nothing is known yet. */
  | 'sending'
  /** The send failed before the node accepted anything. */
  | 'notSent'
  /** The node accepted the transaction; it is not in a block. */
  | 'broadcast'
  /** The broadcast timed out: the node may or may not have it. */
  | 'uncertain'
  /** In a block (1 confirmation or more), not final yet. */
  | 'confirmed'
  | 'final'
  /** Mined but reverted. */
  | 'reverted'
  | 'dropped'
  | 'replaced';

type PhaseInput = {
  /** Null while the send call is still running. */
  readonly outcome: { readonly ok: boolean; readonly isUncertain?: boolean } | null;
  /** Status of the local record, kept current by the status poller; null before it exists. */
  readonly status: TxStatus | null;
};

const SETTLED_PHASE: Record<Exclude<TxStatus, 'pending'>, SendPhase> = {
  confirmed: 'confirmed',
  final: 'final',
  failed: 'reverted',
  dropped: 'dropped',
  replaced: 'replaced',
};

/** Maps the send outcome and the live transaction status to one phase. */
export function resolveSendPhase({ outcome, status }: PhaseInput): SendPhase {
  if (outcome === null) return 'sending';
  if (!outcome.ok) return 'notSent';
  if (status === null || status === 'pending') {
    return outcome.isUncertain === true ? 'uncertain' : 'broadcast';
  }
  return SETTLED_PHASE[status];
}

/** Success styling (check mark, success haptic) starts at the first confirmation, never before. */
export function isSuccessPhase(phase: SendPhase): boolean {
  return phase === 'confirmed' || phase === 'final';
}

/** Phases with nothing left to wait for on this screen's ring and steps. */
export function isProblemPhase(phase: SendPhase): boolean {
  return phase === 'notSent' || phase === 'reverted' || phase === 'dropped' || phase === 'replaced';
}

/**
 * Where the coin sits between the sender (0) and the recipient (1). It only reaches the
 * recipient once the node accepted the transaction; an uncertain broadcast leaves it half way,
 * and a transaction that did not go through is back with the sender.
 */
export function coinPosition(phase: SendPhase): number {
  switch (phase) {
    case 'broadcast':
    case 'confirmed':
    case 'final':
      return 1;
    case 'uncertain':
      return COIN_HALF_WAY;
    default:
      return 0;
  }
}

const COIN_HALF_WAY = 0.5;

/** How full the confirmation ring is, 0 to 1. Only a mined transaction fills it. */
export function ringProgress(
  phase: SendPhase,
  confirmations: number,
  finalConfirmations: number,
): number {
  if (phase === 'final') return 1;
  if (phase !== 'confirmed') return 0;
  return Math.min(Math.max(confirmations, 1), finalConfirmations) / finalConfirmations;
}

export type StepState = 'done' | 'current' | 'waiting';

/** The three steps under the ring: sent to the network, confirmed, final. */
export function stepStates(phase: SendPhase): readonly [StepState, StepState, StepState] {
  switch (phase) {
    case 'broadcast':
      return ['done', 'current', 'waiting'];
    case 'confirmed':
      return ['done', 'done', 'current'];
    case 'final':
      return ['done', 'done', 'done'];
    default:
      // Sending, or an uncertain broadcast: not even the first step is known to be done.
      return ['current', 'waiting', 'waiting'];
  }
}
