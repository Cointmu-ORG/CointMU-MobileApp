import { env } from '@/shared/config';

/** The one place chain identity is defined (architecture §2). Values come from EXPO_PUBLIC_*. */
export const network = {
  name: 'CointMU',
  chainId: env.chainId,
  /** Preset RPC nodes (EXPO_PUBLIC_RPC_URLS). The first is the default. */
  presetUrls: env.rpcUrls,
} as const;

/** Wait for an eth_chainId answer when checking a node; one try, no retries. */
export const NODE_PROBE_TIMEOUT_MS = 5_000;
