import * as Haptics from 'expo-haptics';
import { useEffect, useRef } from 'react';

import { useTxStore } from '@/entities/transaction';

import { isSuccessPhase, resolveSendPhase, type SendPhase } from '../lib/send-phase';
import { useSendFlowStore } from '../model/send-flow-store';

/**
 * The phase of the transfer on screen, live: the send call's outcome from the flow store and the
 * record's status, which the app-level status poller keeps writing while the screen is open.
 */
export function useSendPhase(): { phase: SendPhase; confirmations: number } {
  const outcome = useSendFlowStore((state) => state.outcome);
  const hash = outcome?.ok ? outcome.hash : null;
  const record = useTxStore((state) =>
    hash === null ? undefined : state.records.find((candidate) => candidate.hash === hash),
  );
  return {
    phase: resolveSendPhase({ outcome, status: record?.status ?? null }),
    confirmations: record?.confirmations ?? 0,
  };
}

/** One success haptic when the transaction is first seen in a block; an error one if it reverted. */
export function usePhaseHaptics(phase: SendPhase): void {
  const hasCelebrated = useRef(false);
  const isSuccess = isSuccessPhase(phase);
  const isReverted = phase === 'reverted';

  useEffect(() => {
    if (isSuccess && !hasCelebrated.current) {
      hasCelebrated.current = true;
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [isSuccess]);

  useEffect(() => {
    if (isReverted) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }, [isReverted]);
}
