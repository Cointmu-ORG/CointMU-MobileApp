import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

type AuthPrefsState = {
  isBiometricsEnabled: boolean;
  setBiometricsEnabled: (isEnabled: boolean) => void;
};

// A preference flag, not a secret: safe to persist.
export const useAuthPrefsStore = create<AuthPrefsState>()(
  persist(
    (set) => ({
      isBiometricsEnabled: false,
      setBiometricsEnabled: (isEnabled) => set({ isBiometricsEnabled: isEnabled }),
    }),
    { name: 'muvo.auth.prefs', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
