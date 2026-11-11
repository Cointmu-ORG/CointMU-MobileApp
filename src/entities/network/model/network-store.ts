import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { isHttpUrl } from '@/shared/config';

import { MAX_NODES, network } from '../config/network';

type NetworkChoice = {
  /** Node the user picked; null means the default (first preset). Not a secret. */
  selectedUrl: string | null;
  /** Nodes the user added themselves, each after it passed the chain ID check. */
  customUrls: readonly string[];
};

type NetworkState = NetworkChoice & {
  select: (url: string) => void;
  addCustomUrl: (url: string) => void;
  removeCustomUrl: (url: string) => void;
};

export const NETWORK_STORAGE_VERSION = 1;

/** How many more nodes the user may add: presets and custom nodes share one limit. */
export function remainingCustomSlots(customUrls: readonly string[]): number {
  return Math.max(0, MAX_NODES - network.presetUrls.length - customUrls.length);
}

function sanitizeCustomUrls(value: unknown): string[] {
  const urls = Array.isArray(value) ? value : [];
  const valid = urls.filter(
    (url): url is string =>
      typeof url === 'string' && isHttpUrl(url) && !network.presetUrls.includes(url),
  );
  return [...new Set(valid)].slice(0, Math.max(0, MAX_NODES - network.presetUrls.length));
}

/**
 * Stored choice → current shape. Version 0 held one `customUrl`; version 1 holds a list (D-67).
 * Anything that is not a valid http(s) URL is dropped, and a selection is kept as is: a choice
 * that no longer exists already falls back to the first preset in `resolveActiveUrl`.
 */
export function migrateNetworkChoice(persisted: unknown): NetworkChoice {
  const stored =
    typeof persisted === 'object' && persisted !== null
      ? (persisted as Record<string, unknown>)
      : {};
  const legacy = typeof stored.customUrl === 'string' ? [stored.customUrl] : [];
  return {
    selectedUrl: typeof stored.selectedUrl === 'string' ? stored.selectedUrl : null,
    customUrls: sanitizeCustomUrls(Array.isArray(stored.customUrls) ? stored.customUrls : legacy),
  };
}

export const useNetworkStore = create<NetworkState>()(
  persist(
    (set, get) => ({
      selectedUrl: null,
      customUrls: [],
      select: (url) => set({ selectedUrl: url }),
      addCustomUrl: (url) => {
        const { customUrls } = get();
        if (customUrls.includes(url) || remainingCustomSlots(customUrls) === 0) return;
        set({ customUrls: [...customUrls, url] });
      },
      removeCustomUrl: (url) => {
        const { selectedUrl, customUrls } = get();
        set({
          customUrls: customUrls.filter((custom) => custom !== url),
          // Removing the node in use falls back to the default.
          selectedUrl: selectedUrl === url ? null : selectedUrl,
        });
      },
    }),
    {
      name: 'muvo.network',
      version: NETWORK_STORAGE_VERSION,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ selectedUrl, customUrls }) => ({ selectedUrl, customUrls }),
      migrate: (persisted) => migrateNetworkChoice(persisted),
    },
  ),
);

export type NodeOption = {
  readonly url: string;
  readonly isCustom: boolean;
};

/** Presets first, then the user's nodes in the order they were added. */
export function listNodes(customUrls: readonly string[]): NodeOption[] {
  const presets = network.presetUrls.map((url) => ({ url, isCustom: false }));
  const custom = customUrls
    .filter((url) => !network.presetUrls.includes(url))
    .map((url) => ({ url, isCustom: true }));
  return [...presets, ...custom];
}

/**
 * The node RPC calls go to. A stored choice that no longer exists (a preset removed in a new
 * build, or a custom node deleted) falls back to the first preset.
 */
export function resolveActiveUrl(state: NetworkChoice): string {
  const { selectedUrl, customUrls } = state;
  const isKnown = listNodes(customUrls).some((node) => node.url === selectedUrl);
  return selectedUrl !== null && isKnown ? selectedUrl : (network.presetUrls[0] ?? '');
}

export function useActiveRpcUrl(): string {
  return useNetworkStore(resolveActiveUrl);
}
