type LogLevel = 'debug' | 'info' | 'warn' | 'error';
type LogContext = Readonly<Record<string, unknown>>;

const REDACTED = '[REDACTED]';
// 64-hex strings: private keys, seeds, PIN hashes.
const HEX_SECRET_PATTERN = /(0x)?[0-9a-fA-F]{64}/g;
// Runs of 12+ lowercase words look like a mnemonic.
const MNEMONIC_PATTERN = /\b(?:[a-z]{3,8}\s+){11,}[a-z]{3,8}\b/g;
const SENSITIVE_KEY_PATTERN = /pin|mnemonic|phrase|seed|secret|private|password/i;

/** Removes anything that looks like a wallet secret. Conventions: forbidden rule 1. */
export function redact(text: string): string {
  return text.replace(HEX_SECRET_PATTERN, REDACTED).replace(MNEMONIC_PATTERN, REDACTED);
}

function redactValue(key: string, value: unknown): unknown {
  if (SENSITIVE_KEY_PATTERN.test(key)) return REDACTED;
  if (typeof value === 'string') return redact(value);
  if (value instanceof Error) return redact(value.message);
  return value;
}

function redactContext(context: LogContext | undefined): LogContext | undefined {
  if (!context) return undefined;
  return Object.fromEntries(
    Object.entries(context).map(([key, value]) => [key, redactValue(key, value)]),
  );
}

function write(level: LogLevel, message: string, context?: LogContext): void {
  if (level === 'debug' && !__DEV__) return;
  const entry = { level, message: redact(message), ...redactContext(context) };
  console[level](JSON.stringify(entry));
}

export const logger = {
  debug: (message: string, context?: LogContext) => write('debug', message, context),
  info: (message: string, context?: LogContext) => write('info', message, context),
  warn: (message: string, context?: LogContext) => write('warn', message, context),
  error: (message: string, context?: LogContext) => write('error', message, context),
};
