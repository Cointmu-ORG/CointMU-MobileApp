import { useAccountBalancesStore, useBalanceStore } from '@/entities/account';
import { getVisibleTokens, useTokenBalanceStore } from '@/entities/asset';
import {
  getProvider,
  network,
  probeNode,
  remainingCustomSlots,
  useNetworkStore,
  type NodeProbe,
} from '@/entities/network';
import { useWalletStore } from '@/entities/wallet';
import { isCleartextAllowed, isHttpUrl } from '@/shared/config';

export type SelectNodeResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly probe: Exclude<NodeProbe, { status: 'reachable' }> };

export type AddNodeError = 'invalidUrl' | 'cleartextBlocked' | 'alreadyListed' | 'limitReached';
export type AddNodeResult = SelectNodeResult | { readonly ok: false; readonly error: AddNodeError };

/** Balances came from the old node; fetch them again from the new one. */
function refreshBalance(): void {
  const { address } = useWalletStore.getState();
  const balance = useBalanceStore.getState();
  const tokenBalances = useTokenBalanceStore.getState();
  balance.clear();
  tokenBalances.clear();
  // The Wallets tab fetches its cards again when it is next shown.
  useAccountBalancesStore.getState().clear();
  if (address === null) return;
  void balance.refresh(address);
  void tokenBalances.refresh(getProvider(), address, getVisibleTokens());
}

/**
 * Switches RPC calls to `url`, but only after the node answered eth_chainId with the CointMU
 * chain ID, checked now and not taken from an earlier ping. A node on another chain, or one
 * that does not answer, is refused.
 */
export async function selectNode(url: string): Promise<SelectNodeResult> {
  const probe = await probeNode(url);
  if (probe.status !== 'reachable') return { ok: false, probe };
  useNetworkStore.getState().select(url);
  refreshBalance();
  return { ok: true };
}

/** Adds one of the user's own nodes after the same chain ID check, and switches to it. */
export async function addCustomNode(input: string): Promise<AddNodeResult> {
  const url = input.trim();
  const { customUrls } = useNetworkStore.getState();
  if (!isHttpUrl(url)) return { ok: false, error: 'invalidUrl' };
  // A release build blocks http:// to hosts it was not built for (D-87); say so instead of
  // reporting the node as unreachable. Development builds allow cleartext.
  // ponytail: __DEV__ is also false in Expo Go started with --no-dev, where http:// would work.
  if (!__DEV__ && !isCleartextAllowed(url)) return { ok: false, error: 'cleartextBlocked' };
  if (network.presetUrls.includes(url) || customUrls.includes(url)) {
    return { ok: false, error: 'alreadyListed' };
  }
  if (remainingCustomSlots(customUrls) === 0) return { ok: false, error: 'limitReached' };
  const probe = await probeNode(url);
  if (probe.status !== 'reachable') return { ok: false, probe };
  useNetworkStore.getState().addCustomUrl(url);
  useNetworkStore.getState().select(url);
  refreshBalance();
  return { ok: true };
}

/** Removes one of the user's nodes. If it was in use, RPC calls go back to the default node. */
export function removeCustomNode(url: string): void {
  const wasSelected = useNetworkStore.getState().selectedUrl === url;
  useNetworkStore.getState().removeCustomUrl(url);
  if (wasSelected) refreshBalance();
}
