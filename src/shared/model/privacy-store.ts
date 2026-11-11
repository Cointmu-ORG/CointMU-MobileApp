import { create } from 'zustand';

/** How long a tap on the eye shows the amounts (the desktop hides a revealed key after 30 s). */
export const REVEAL_DURATION_MS = 30_000;

type PrivacyRevealState = {
  isRevealed: boolean;
  /** Shows hidden amounts for a short while, then hides them again. */
  revealTemporarily: () => void;
  hide: () => void;
};

let hideTimer: ReturnType<typeof setTimeout> | null = null;

function clearHideTimer(): void {
  if (hideTimer !== null) clearTimeout(hideTimer);
  hideTimer = null;
}

/** In memory only: every start, and every return from the background, begins hidden again. */
export const usePrivacyRevealStore = create<PrivacyRevealState>()((set) => ({
  isRevealed: false,
  revealTemporarily: () => {
    clearHideTimer();
    set({ isRevealed: true });
    hideTimer = setTimeout(() => set({ isRevealed: false }), REVEAL_DURATION_MS);
  },
  hide: () => {
    clearHideTimer();
    set({ isRevealed: false });
  },
}));
