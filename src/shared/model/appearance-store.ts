import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  APPEARANCE_STORAGE_VERSION,
  DEFAULT_APPEARANCE,
  migrateAppearance,
  type AppearancePrefs,
} from './appearance-prefs';

type AppearanceState = AppearancePrefs & {
  hasHydrated: boolean;
  update: (changes: Partial<AppearancePrefs>) => void;
};

/**
 * Settings > Appearance. Persisted (`muvo.appearance`, public data) and applied as soon as a
 * value changes: the theme root, the formatters and the privacy cover all subscribe to it.
 */
export const useAppearanceStore = create<AppearanceState>()(
  persist(
    (set) => ({
      ...DEFAULT_APPEARANCE,
      hasHydrated: false,
      update: (changes) => set(changes),
    }),
    {
      name: 'muvo.appearance',
      version: APPEARANCE_STORAGE_VERSION,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ hasHydrated: _hasHydrated, update: _update, ...prefs }) => prefs,
      migrate: (persisted) => migrateAppearance(persisted),
      // Same check for a current-version record: storage is outside the app's control.
      merge: (persisted, current) => ({ ...current, ...migrateAppearance(persisted) }),
      onRehydrateStorage: () => () => useAppearanceStore.setState({ hasHydrated: true }),
    },
  ),
);
