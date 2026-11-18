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
 * The status chip of the receipt, in the same words as History. Null while nothing has reached
 * the network (sending, not sent): there is no transaction to give a status to.
 */
export function phaseTxStatus(phase: SendPhase): TxStatus | null {
  switch (phase) {
    case 'sending':
    case 'notSent':
      return null;
    case 'broadcast':
    case 'uncertain':
      return 'pending';
    case 'reverted':
      return 'failed';
    default:
      return phase;
  }
}

export type StepState = 'done' | 'current' | 'waiting';

/** The three steps of the receipt: Sent, Confirmed, Completed. */
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
