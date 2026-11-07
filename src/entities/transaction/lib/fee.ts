/** What ethers' getFeeData() returns; null fields are not supported by the node. */
export type FeeDataLike = {
  readonly gasPrice: bigint | null;
  readonly maxFeePerGas: bigint | null;
  readonly maxPriorityFeePerGas: bigint | null;
};

type QuoteBase = {
  readonly gasLimit: bigint;
  /** Worst-case fee in wei (gasLimit × max price). Balance checks use this. */
  readonly maxFee: bigint;
  /** Epoch ms; the review screen refreshes a quote older than FEE_QUOTE_MAX_AGE_MS. */
  readonly fetchedAt: number;
};

export type FeeQuote =
  | (QuoteBase & {
      readonly mode: 'eip1559';
      readonly maxFeePerGas: bigint;
      readonly maxPriorityFeePerGas: bigint;
    })
  | (QuoteBase & { readonly mode: 'legacy'; readonly gasPrice: bigint });

export class FeeUnavailableError extends Error {
  constructor() {
    super('The node returned neither EIP-1559 fees nor a gas price');
    this.name = 'FeeUnavailableError';
  }
}

/**
 * D-22: EIP-1559 (type 2) when the node reports maxFeePerGas, otherwise legacy gasPrice (type 0).
 * CointMU nodes support EIP-1559 (D-47); the legacy path stays for nodes that do not.
 */
export function buildFeeQuote(feeData: FeeDataLike, gasLimit: bigint, now: number): FeeQuote {
  const { maxFeePerGas, maxPriorityFeePerGas, gasPrice } = feeData;
  if (maxFeePerGas !== null && maxPriorityFeePerGas !== null) {
    return {
      mode: 'eip1559',
      gasLimit,
      maxFeePerGas,
      maxPriorityFeePerGas,
      maxFee: gasLimit * maxFeePerGas,
      fetchedAt: now,
    };
  }
  if (gasPrice !== null) {
    return { mode: 'legacy', gasLimit, gasPrice, maxFee: gasLimit * gasPrice, fetchedAt: now };
  }
  throw new FeeUnavailableError();
}

/** The fee fields of the transaction to sign, matching the quote's mode. */
export function feeFields(quote: FeeQuote) {
  return quote.mode === 'eip1559'
    ? {
        type: 2,
        maxFeePerGas: quote.maxFeePerGas,
        maxPriorityFeePerGas: quote.maxPriorityFeePerGas,
      }
    : { type: 0, gasPrice: quote.gasPrice };
}

export function isQuoteStale(quote: FeeQuote, now: number, maxAgeMs: number): boolean {
  return now - quote.fetchedAt > maxAgeMs;
}
