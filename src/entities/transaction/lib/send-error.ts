import { isError } from 'ethers';

/** Friendly categories shown to the user; raw RPC text never reaches the UI. */
export type SendErrorCode =
  | 'insufficientFunds'
  | 'nonceTooLow'
  | 'underpriced'
  | 'replacement'
  | 'network'
  | 'wrongChain'
  | 'reverted'
  | 'unknown';

// Geth error texts, for nodes whose errors ethers does not map to a code.
const MESSAGE_PATTERNS: readonly (readonly [RegExp, SendErrorCode])[] = [
  [/insufficient funds/i, 'insufficientFunds'],
  [/nonce too low|nonce has already been used/i, 'nonceTooLow'],
  [/replacement transaction underpriced|already known/i, 'replacement'],
  [/underpriced|fee cap less than block base fee|max fee per gas less than/i, 'underpriced'],
  [/execution reverted|always failing transaction/i, 'reverted'],
];

const ETHERS_CODES: readonly (readonly [Parameters<typeof isError>[1], SendErrorCode])[] = [
  ['INSUFFICIENT_FUNDS', 'insufficientFunds'],
  ['NONCE_EXPIRED', 'nonceTooLow'],
  ['REPLACEMENT_UNDERPRICED', 'replacement'],
  ['TRANSACTION_REPLACED', 'replacement'],
  ['CALL_EXCEPTION', 'reverted'],
  ['NETWORK_ERROR', 'network'],
  ['TIMEOUT', 'network'],
];

function collectMessages(error: unknown, depth = 0): string {
  if (typeof error !== 'object' || error === null || depth > 3) return '';
  const record = error as Record<string, unknown>;
  const own = ['message', 'shortMessage']
    .map((key) => (typeof record[key] === 'string' ? record[key] : ''))
    .join(' ');
  return `${own} ${collectMessages(record.info, depth + 1)} ${collectMessages(record.error, depth + 1)} ${collectMessages(record.cause, depth + 1)}`;
}

/** Maps any estimate/sign/broadcast failure to a friendly category. */
export function classifySendError(error: unknown): SendErrorCode {
  for (const [code, mapped] of ETHERS_CODES) {
    if (isError(error, code)) return mapped;
  }
  if (error instanceof Error && error.name === 'RpcUnavailableError') return 'network';
  const text = collectMessages(error);
  return MESSAGE_PATTERNS.find(([pattern]) => pattern.test(text))?.[1] ?? 'unknown';
}
