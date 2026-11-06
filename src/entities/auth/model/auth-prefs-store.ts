import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { AUTO_LOCK_DEFAULT_MS, type AutoLockMs } from '../config/auth-config';

type AuthPrefsState = {
  isBiometricsEnabled: boolean;
  setBiometricsEnabled: (isEnabled: boolean) => void;
  autoLockMs: AutoLockMs;
  setAutoLockMs: (timeoutMs: AutoLockMs) => void;
};

// Preferences, not secrets: safe to persist.
export const useAuthPrefsStore = create<AuthPrefsState>()(
  persist(
    (set) => ({
      isBiometricsEnabled: false,
      setBiometricsEnabled: (isEnabled) => set({ isBiometricsEnabled: isEnabled }),
      autoLockMs: AUTO_LOCK_DEFAULT_MS,
      setAutoLockMs: (timeoutMs) => set({ autoLockMs: timeoutMs }),
    }),
    { name: 'muvo.auth.prefs', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
