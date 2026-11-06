const UINT32_RANGE = 2 ** 32;

/**
 * Uniform random integer in [0, maxExclusive) from crypto.getRandomValues (polyfilled in
 * index.ts). Rejection sampling avoids modulo bias.
 */
export function secureRandomInt(maxExclusive: number): number {
  if (!Number.isSafeInteger(maxExclusive) || maxExclusive <= 0 || maxExclusive > UINT32_RANGE) {
    throw new RangeError(`secureRandomInt: invalid bound ${maxExclusive}`);
  }
  const limit = UINT32_RANGE - (UINT32_RANGE % maxExclusive);
  const buffer = new Uint32Array(1);
  for (;;) {
    globalThis.crypto.getRandomValues(buffer);
    const value = buffer[0] ?? 0;
    if (value < limit) return value % maxExclusive;
  }
}

export type RandomInt = (maxExclusive: number) => number;
