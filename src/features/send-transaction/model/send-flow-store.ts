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

type SendFlowState = {
  draft: SendDraft | null;
  prefill: SendPrefill | null;
  outcome: SendOutcome | null;
  setDraft: (draft: SendDraft | null) => void;
  setPrefill: (prefill: SendPrefill | null) => void;
  setOutcome: (outcome: SendOutcome | null) => void;
  reset: () => void;
};

// In memory, never persisted: the flow restarts from the form after the app is killed.
export const useSendFlowStore = create<SendFlowState>()((set) => ({
  draft: null,
  prefill: null,
  outcome: null,
  setDraft: (draft) => set({ draft }),
  setPrefill: (prefill) => set({ prefill }),
  setOutcome: (outcome) => set({ outcome }),
  reset: () => set({ draft: null, prefill: null, outcome: null }),
}));
