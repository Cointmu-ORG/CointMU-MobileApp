export const RPC_TIMEOUT_MS = 10_000;
/** Retries apply to idempotent reads only. */
export const RPC_MAX_RETRIES = 2;
export const RPC_RETRY_BASE_DELAY_MS = 500;

// ponytail: fixed interval; tune once block time is known (Q-04).
export const BALANCE_POLL_INTERVAL_MS = 15_000;

/** Max fraction digits shown for coin amounts. Display only; values stay bigint. */
export const AMOUNT_DISPLAY_FRACTION_DIGITS = 6;

export const SUPPORTED_LANGUAGES = ['en', 'id'] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];
export const FALLBACK_LANGUAGE: Language = 'en';
