import { create } from 'zustand';

type SessionState = {
  isUnlocked: boolean;
  unlock: () => void;
  lock: () => void;
};

// In memory only: every cold start begins locked.
export const useSessionStore = create<SessionState>()((set) => ({
  isUnlocked: false,
  unlock: () => set({ isUnlocked: true }),
  lock: () => set({ isUnlocked: false }),
}));
