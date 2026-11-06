import { RPC_MAX_RETRIES, RPC_RETRY_BASE_DELAY_MS, RPC_TIMEOUT_MS } from '@/shared/config';

export type RpcCallOptions = {
  readonly timeoutMs: number;
  readonly retries: number;
  readonly baseDelayMs: number;
};

const DEFAULT_OPTIONS: RpcCallOptions = {
  timeoutMs: RPC_TIMEOUT_MS,
  retries: RPC_MAX_RETRIES,
  baseDelayMs: RPC_RETRY_BASE_DELAY_MS,
};

/** Wraps any RPC failure. UI shows a friendly message; `cause` is for logs only. */
export class RpcUnavailableError extends Error {
  constructor(cause: unknown) {
    super('RPC request failed', { cause });
    this.name = 'RpcUnavailableError';
  }
}

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

async function withTimeout<T>(call: () => Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`RPC timeout after ${timeoutMs} ms`)), timeoutMs);
  });
  try {
    return await Promise.race([call(), timeout]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Runs an idempotent RPC read with a timeout and exponential-backoff retries.
 * Never use for broadcasts: retrying a send can double-submit.
 */
export async function callRpc<T>(
  call: () => Promise<T>,
  options: Partial<RpcCallOptions> = {},
): Promise<T> {
  const { timeoutMs, retries, baseDelayMs } = { ...DEFAULT_OPTIONS, ...options };
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    if (attempt > 0) await delay(baseDelayMs * 2 ** (attempt - 1));
    try {
      return await withTimeout(call, timeoutMs);
    } catch (error) {
      lastError = error;
    }
  }
  throw new RpcUnavailableError(lastError);
}
