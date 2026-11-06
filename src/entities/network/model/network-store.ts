import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { network } from '../config/network';

type NetworkState = {
  /** Node the user picked; null means the default (first preset). Not a secret. */
  selectedUrl: string | null;
  /** One node the user added themselves, after it passed the chain ID check. */
  customUrl: string | null;
  select: (url: string) => void;
  setCustomUrl: (url: string | null) => void;
};

export const useNetworkStore = create<NetworkState>()(
  persist(
    (set, get) => ({
      selectedUrl: null,
      customUrl: null,
      select: (url) => set({ selectedUrl: url }),
      setCustomUrl: (url) => {
        const { selectedUrl, customUrl } = get();
        // Removing the custom node while it is in use falls back to the default.
        const isSelectedRemoved = url === null && selectedUrl !== null && selectedUrl === customUrl;
        set({ customUrl: url, selectedUrl: isSelectedRemoved ? null : selectedUrl });
      },
    }),
    {
      name: 'muvo.network',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ selectedUrl, customUrl }) => ({ selectedUrl, customUrl }),
    },
  ),
);

export type NodeOption = {
  readonly url: string;
  readonly isCustom: boolean;
};

/** Presets first, then the custom node. */
export function listNodes(customUrl: string | null): NodeOption[] {
  const presets = network.presetUrls.map((url) => ({ url, isCustom: false }));
  return customUrl === null || network.presetUrls.includes(customUrl)
    ? presets
    : [...presets, { url: customUrl, isCustom: true }];
}

/**
 * The node RPC calls go to. A stored choice that no longer exists (a preset removed in a new
 * build, or the custom node deleted) falls back to the first preset.
 */
export function resolveActiveUrl(state: Pick<NetworkState, 'selectedUrl' | 'customUrl'>): string {
  const { selectedUrl, customUrl } = state;
  const isKnown = listNodes(customUrl).some((node) => node.url === selectedUrl);
  return selectedUrl !== null && isKnown ? selectedUrl : (network.presetUrls[0] ?? '');
}

export function useActiveRpcUrl(): string {
  return useNetworkStore(resolveActiveUrl);
}
