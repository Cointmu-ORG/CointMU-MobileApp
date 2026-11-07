import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMemo } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { env } from '@/shared/config';

import { BUILTIN_TOKENS, getAssetKey, NATIVE_ASSET } from '../config/registry';
import type { Asset, Erc20Asset } from './types';

type TokenState = {
  /** Custom tokens per chain ID. Public contract data, not secrets. */
  custom: Readonly<Record<string, readonly Erc20Asset[]>>;
  /** Asset keys the user hid, per chain ID. */
  hidden: Readonly<Record<string, readonly string[]>>;
  addCustom: (token: Erc20Asset) => void;
  removeCustom: (key: string) => void;
  setHidden: (key: string, isHidden: boolean) => void;
  clear: () => void;
};

// Tokens are per chain; the app talks to one chain (env.chainId) and keeps the others intact.
const chainKey = () => String(env.chainId);

export const useTokenStore = create<TokenState>()(
  persist(
    (set, get) => ({
      custom: {},
      hidden: {},
      addCustom: (token) => {
        const list = get().custom[chainKey()] ?? [];
        const key = getAssetKey(token);
        const isKnown = [...BUILTIN_TOKENS, ...list].some((t) => getAssetKey(t) === key);
        if (isKnown) return;
        set({ custom: { ...get().custom, [chainKey()]: [...list, token] } });
      },
      removeCustom: (key) => {
        const list = get().custom[chainKey()] ?? [];
        set({
          custom: { ...get().custom, [chainKey()]: list.filter((t) => getAssetKey(t) !== key) },
        });
        get().setHidden(key, false);
      },
      setHidden: (key, isHidden) => {
        const hidden = (get().hidden[chainKey()] ?? []).filter((k) => k !== key);
        set({ hidden: { ...get().hidden, [chainKey()]: isHidden ? [...hidden, key] : hidden } });
      },
      clear: () => set({ custom: {}, hidden: {} }),
    }),
    {
      name: 'muvo.tokens',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ custom, hidden }) => ({ custom, hidden }),
    },
  ),
);

/** Every token known on this chain (built-in, then custom), hidden ones included. */
export function useAllTokens(): readonly Erc20Asset[] {
  const custom = useTokenStore((state) => state.custom[chainKey()]);
  return useMemo(() => [...BUILTIN_TOKENS, ...(custom ?? [])], [custom]);
}

/** Assets shown and sendable: native CMU first, then the tokens the user did not hide. */
export function useVisibleAssets(): readonly Asset[] {
  const tokens = useAllTokens();
  const hidden = useTokenStore((state) => state.hidden[chainKey()]);
  return useMemo(
    () => [NATIVE_ASSET, ...tokens.filter((t) => !(hidden ?? []).includes(getAssetKey(t)))],
    [tokens, hidden],
  );
}

export function useIsAssetHidden(key: string): boolean {
  return useTokenStore((state) => (state.hidden[chainKey()] ?? []).includes(key));
}

/** Non-hook version of the visible tokens, for pollers and actions. */
export function getVisibleTokens(): Erc20Asset[] {
  const { custom, hidden } = useTokenStore.getState();
  const hiddenKeys = hidden[chainKey()] ?? [];
  return [...BUILTIN_TOKENS, ...(custom[chainKey()] ?? [])].filter(
    (token) => !hiddenKeys.includes(getAssetKey(token)),
  );
}

/** Looks up an asset by key among native CMU and every known token. */
export function findAsset(key: string): Asset | null {
  if (key === getAssetKey(NATIVE_ASSET)) return NATIVE_ASSET;
  const custom = useTokenStore.getState().custom[chainKey()] ?? [];
  return [...BUILTIN_TOKENS, ...custom].find((t) => getAssetKey(t) === key) ?? null;
}
