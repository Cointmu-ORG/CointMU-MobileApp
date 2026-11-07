import { makeError } from 'ethers';

import { buildFeeQuote, feeFields, FeeUnavailableError, isQuoteStale } from './fee';
import { classifySendError } from './send-error';

const GAS = 21_000n;
const NOW = 1_700_000_000_000;
const QUOTE_MAX_AGE_MS = 30_000;

describe('fee mode detection (D-22)', () => {
  it('uses EIP-1559 when the node reports maxFeePerGas', () => {
    const quote = buildFeeQuote(
      { gasPrice: 9n, maxFeePerGas: 20n, maxPriorityFeePerGas: 2n },
      GAS,
      NOW,
    );
    expect(quote).toMatchObject({ mode: 'eip1559', maxFee: GAS * 20n });
    expect(feeFields(quote)).toEqual({ type: 2, maxFeePerGas: 20n, maxPriorityFeePerGas: 2n });
  });

  it('falls back to a legacy gasPrice', () => {
    const quote = buildFeeQuote(
      { gasPrice: 9n, maxFeePerGas: null, maxPriorityFeePerGas: null },
      GAS,
      NOW,
    );
    expect(quote).toMatchObject({ mode: 'legacy', maxFee: GAS * 9n });
    expect(feeFields(quote)).toEqual({ type: 0, gasPrice: 9n });
  });

  it('fails when the node gives no fee at all', () => {
    expect(() =>
      buildFeeQuote({ gasPrice: null, maxFeePerGas: null, maxPriorityFeePerGas: null }, GAS, NOW),
    ).toThrow(FeeUnavailableError);
  });

  it('marks a quote stale after the max age', () => {
    const quote = buildFeeQuote(
      { gasPrice: 1n, maxFeePerGas: null, maxPriorityFeePerGas: null },
      GAS,
      NOW,
    );
    expect(isQuoteStale(quote, NOW + QUOTE_MAX_AGE_MS, QUOTE_MAX_AGE_MS)).toBe(false);
    expect(isQuoteStale(quote, NOW + QUOTE_MAX_AGE_MS + 1, QUOTE_MAX_AGE_MS)).toBe(true);
  });
});

describe('classifySendError', () => {
  it.each([
    [makeError('x', 'INSUFFICIENT_FUNDS'), 'insufficientFunds'],
    [makeError('x', 'NONCE_EXPIRED'), 'nonceTooLow'],
    [makeError('x', 'REPLACEMENT_UNDERPRICED'), 'replacement'],
    [makeError('x', 'NETWORK_ERROR'), 'network'],
    [makeError('x', 'TIMEOUT', { operation: 'send' }), 'network'],
  ] as const)('maps ethers code %#', (error, expected) => {
    expect(classifySendError(error)).toBe(expected);
  });

  it.each([
    ['insufficient funds for gas * price + value', 'insufficientFunds'],
    ['nonce too low', 'nonceTooLow'],
    ['replacement transaction underpriced', 'replacement'],
    ['transaction underpriced', 'underpriced'],
    ['max fee per gas less than block base fee', 'underpriced'],
    ['execution reverted', 'reverted'],
    ['something odd happened', 'unknown'],
  ])('maps the geth message %p', (message, expected) => {
    const rpcError = { code: 'UNKNOWN_ERROR', info: { error: { code: -32000, message } } };
    expect(classifySendError(rpcError)).toBe(expected);
  });

  it('treats the RPC wrapper error as a network problem', () => {
    const error = Object.assign(new Error('RPC request failed', { cause: new Error('timeout') }), {
      name: 'RpcUnavailableError',
    });
    expect(classifySendError(error)).toBe('network');
  });

  it("looks inside the RPC wrapper for the node's own answer", () => {
    const cause = makeError('x', 'CALL_EXCEPTION', {
      action: 'estimateGas',
      data: null,
      reason: null,
      transaction: { to: null, data: '0x' },
      invocation: null,
      revert: null,
    });
    const error = Object.assign(new Error('RPC request failed', { cause }), {
      name: 'RpcUnavailableError',
    });
    expect(classifySendError(error)).toBe('reverted');
  });
});
