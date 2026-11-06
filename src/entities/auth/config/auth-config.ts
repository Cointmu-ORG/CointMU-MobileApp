export const PIN_LENGTH = 6;

/**
 * PIN KDF parameters. PLACEHOLDER (Q-32): algorithm and cost are not final.
 * v2 (D-41): 20,000 → 2,000 iterations. Pure-JS PBKDF2 runs on the JS thread; 20,000 took
 * ~4.7 s per hash in an interpreter (no JIT, like Hermes), on setup and on every unlock.
 * Changing these is safe: stored records keep their own params and are rehashed on next unlock.
 */
export const PIN_KDF = {
  version: 2,
  algo: 'pbkdf2-sha256',
  iterations: 2_000,
  saltBytes: 16,
  keyBytes: 32,
} as const;

const SECOND_MS = 1_000;
const MINUTE_MS = 60 * SECOND_MS;
const HOUR_MS = 60 * MINUTE_MS;

/** Placeholder escalation (D-16): free attempts, then growing waits. */
export const LOCKOUT_POLICY = {
  freeAttempts: 4,
  stepsMs: [30 * SECOND_MS, MINUTE_MS, 5 * MINUTE_MS, 15 * MINUTE_MS, HOUR_MS],
  resetOfferAfterFailures: 10,
} as const;

/** D-16. User-adjustable later (lock-settings feature). */
export const AUTO_LOCK_DEFAULT_MS = MINUTE_MS;
