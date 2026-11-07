// Values measured by `npm run probe:nodes` on 2026-11-07 against the three CointMU nodes
// (Geth 1.10.26, head 374017, last 1000 blocks): avg block 12.54 s, p95 38 s, max 109 s,
// uncle rate 0.2 %, eth_getLogs accepted 10,000 blocks (10–76 ms), full block 5–8 ms
// (100-block batch 18–36 ms) on the LAN. Re-run the probe and update these when the chain changes.
// No imports: scripts/watch-tx.js loads this file directly with Node.

const MEASURED_AVG_BLOCK_TIME_MS = 12_540;
const MIN_TX_POLL_INTERVAL_MS = 3_000;

export type TxPolicy = {
  /** D-23 / Q-04: 12 blocks ≈ 2.5 min at the measured block time; uncle rate 0.2 % gives no reason to change it. */
  readonly finalConfirmations: number;
  /**
   * A tx the node does not know, whose nonce is still unused, counts as dropped only after this
   * long. Above the longest measured block gap (109 s) so slow blocks and gossip never trigger it.
   */
  readonly droppedAfterMs: number;
};

export const TX_POLICY: TxPolicy = {
  finalConfirmations: 12,
  droppedAfterMs: 180_000,
};

/** Receipt polling: about half the measured block time, never faster than the floor. */
export const TX_POLL_INTERVAL_MS = Math.max(
  MIN_TX_POLL_INTERVAL_MS,
  Math.round(MEASURED_AVG_BLOCK_TIME_MS / 2),
);

/** History: eth_getLogs block range per request (largest range the probe tried; all nodes accepted it). */
export const LOGS_CHUNK_BLOCKS = 10_000;

/**
 * History: native transfers come from a block scan (architecture §8). One page fetches this many
 * blocks (≈ 3.5 h of chain, ≈ 0.2–0.4 s in 100-block batches on the LAN; slower on mobile data).
 */
export const NATIVE_SCAN_PAGE_BLOCKS = 1_000;

/** History: the native scan never looks further back than this (≈ 7 days at 12.5 s blocks). */
export const NATIVE_SCAN_WINDOW_BLOCKS = 50_000;

/** Poll backoff after failed polls: the interval doubles per failure, capped here. */
export const TX_POLL_MAX_BACKOFF_MS = 60_000;

/** Records polled at once, to keep one node from being flooded. */
export const TX_POLL_CONCURRENCY = 3;

/** History: smallest getLogs range to fall back to when a node rejects a wider one. */
export const MIN_LOGS_CHUNK_BLOCKS = 500;

/**
 * History: full blocks requested at once during the native scan. ethers batches concurrent
 * requests into one JSON-RPC batch (up to 100), which the probe measured at 18–36 ms on the LAN.
 */
export const BLOCK_FETCH_CONCURRENCY = 50;
