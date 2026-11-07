import { useBalanceStore } from '@/entities/account';
import { network, probeNode, useNetworkStore, type NodeProbe } from '@/entities/network';
import { useWalletStore } from '@/entities/wallet';
import { isHttpUrl } from '@/shared/config';

export type SelectNodeResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly probe: Exclude<NodeProbe, { status: 'reachable' }> };

export type AddNodeError = 'invalidUrl' | 'alreadyListed';
export type AddNodeResult = SelectNodeResult | { readonly ok: false; readonly error: AddNodeError };

/** The balance came from the old node; fetch it again from the new one. */
function refreshBalance(): void {
  const { address } = useWalletStore.getState();
  const balance = useBalanceStore.getState();
  balance.clear();
  if (address !== null) void balance.refresh(address);
}

/**
 * Switches RPC calls to `url`, but only after the node answered eth_chainId with the CointMU
 * chain ID. A node on another chain, or one that does not answer, is refused.
 */
export async function selectNode(url: string): Promise<SelectNodeResult> {
  const probe = await probeNode(url);
  if (probe.status !== 'reachable') return { ok: false, probe };
  useNetworkStore.getState().select(url);
  refreshBalance();
  return { ok: true };
}

/** Adds the user's own node after the same chain ID check, and switches to it. */
export async function addCustomNode(input: string): Promise<AddNodeResult> {
  const url = input.trim();
  if (!isHttpUrl(url)) return { ok: false, error: 'invalidUrl' };
  if (network.presetUrls.includes(url) || url === useNetworkStore.getState().customUrl) {
    return { ok: false, error: 'alreadyListed' };
  }
  const probe = await probeNode(url);
  if (probe.status !== 'reachable') return { ok: false, probe };
  useNetworkStore.getState().setCustomUrl(url);
  useNetworkStore.getState().select(url);
  refreshBalance();
  return { ok: true };
}

export function removeCustomNode(): void {
  const { customUrl, selectedUrl } = useNetworkStore.getState();
  const wasSelected = customUrl !== null && customUrl === selectedUrl;
  useNetworkStore.getState().setCustomUrl(null);
  if (wasSelected) refreshBalance();
}
