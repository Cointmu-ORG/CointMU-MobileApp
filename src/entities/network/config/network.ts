import { env } from '@/shared/config';

/** The one place chain identity is defined (architecture §2). Values come from EXPO_PUBLIC_*. */
export const network = {
  name: 'CointMU',
  chainId: env.chainId,
  /** Preset RPC nodes (EXPO_PUBLIC_RPC_URLS). The first is the default. */
  presetUrls: env.rpcUrls,
} as const;

/** Wait for one answer when checking a node; one try per call, no retries. */
export const NODE_PROBE_TIMEOUT_MS = 5_000;

/** Nodes pinged at the same time by "Ping all", so a long list never floods a slow link. */
export const NODE_PROBE_CONCURRENCY = 3;

/**
 * A node this many blocks behind the best one is flagged "out of sync". About two minutes at
 * the measured 12.5 s block time (D-47), well past a normal propagation delay.
 */
export const NODE_SYNC_LAG_BLOCKS = 10;

/** Presets and the user's own nodes together, like the desktop node list. */
export const MAX_NODES = 10;
