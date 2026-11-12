import { create } from 'zustand';

import type { Asset } from '@/entities/asset';
import type { FeeQuote, SendErrorCode } from '@/entities/transaction';

/** What the form hands to the review screen. Public data only, never a key. */
export type SendDraft = {
  readonly asset: Asset;
  readonly to: string;
  readonly amount: bigint;
  readonly quote: FeeQuote;
  readonly isSelfSend: boolean;
  readonly isContractRecipient: boolean;
};

/** A scanned payment request; it only fills the form, it never sends. */
export type SendPrefill = {
  readonly to: string;
  readonly assetKey: string;
  readonly amount: bigint | null;
};

export type SendOutcome =
  | { readonly ok: true; readonly hash: string; readonly isUncertain: boolean }
  | { readonly ok: false; readonly error: SendErrorCode };

/** What the send call is doing right now. */
export type SendStage = 'checkingNetwork' | 'signing' | 'broadcasting';

type SendFlowState = {
  draft: SendDraft | null;
  prefill: SendPrefill | null;
  /** Set while a transfer is being signed and broadcast; null before and after. */
  stage: SendStage | null;
  outcome: SendOutcome | null;
  setDraft: (draft: SendDraft | null) => void;
  setPrefill: (prefill: SendPrefill | null) => void;
  /** A transfer starts: any earlier outcome is cleared. */
  beginSending: () => void;
  setStage: (stage: SendStage) => void;
  /** The transfer ended, sent or not. */
  finishSending: (outcome: SendOutcome) => void;
  reset: () => void;
};

// In memory, never persisted: the flow restarts from the form after the app is killed.
export const useSendFlowStore = create<SendFlowState>()((set) => ({
  draft: null,
  prefill: null,
  stage: null,
  outcome: null,
  setDraft: (draft) => set({ draft }),
  setPrefill: (prefill) => set({ prefill }),
  beginSending: () => set({ stage: 'checkingNetwork', outcome: null }),
  setStage: (stage) => set({ stage }),
  finishSending: (outcome) => set({ stage: null, outcome }),
  reset: () => set({ draft: null, prefill: null, stage: null, outcome: null }),
}));
