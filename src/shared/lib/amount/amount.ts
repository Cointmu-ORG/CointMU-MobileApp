import { formatUnits } from 'ethers';

export type FormatAmountOptions = {
  readonly locale: string;
  readonly maxFractionDigits: number;
  /**
   * Longest text a narrow slot can hold. Decimals are dropped (truncated, never rounded) until
   * the number fits, so a long balance is shortened by precision and never cut by an ellipsis.
   * The whole part is always shown in full.
   */
  readonly maxLength?: number;
};

export type Separators = { readonly group: string; readonly decimal: string };

const SEPARATOR_PROBE = 1000.5;
const DEFAULT_SEPARATORS: Separators = { group: ',', decimal: '.' };
const THOUSANDS_PATTERN = /\B(?=(\d{3})+(?!\d))/g;

export function getSeparators(locale: string): Separators {
  try {
    const parts = new Intl.NumberFormat(locale).formatToParts(SEPARATOR_PROBE);
    return {
      group: parts.find((part) => part.type === 'group')?.value ?? DEFAULT_SEPARATORS.group,
      decimal: parts.find((part) => part.type === 'decimal')?.value ?? DEFAULT_SEPARATORS.decimal,
    };
  } catch {
    // Unknown locale tag: fall back to en-style separators rather than failing the render.
    return DEFAULT_SEPARATORS;
  }
}

/**
 * Formats an integer amount in base units (wei) for display, locale-aware, with no floats.
 * Truncates (never rounds up) so a balance is never overstated.
 */
export function formatAmount(
  value: bigint,
  decimals: number,
  options: FormatAmountOptions,
): string {
  const isNegative = value < 0n;
  const [whole, fraction = ''] = formatUnits(isNegative ? -value : value, decimals).split('.');
  const { group, decimal } = getSeparators(options.locale);
  const head = `${isNegative ? '-' : ''}${whole.replace(THOUSANDS_PATTERN, group)}`;
  // Room left for the decimal separator and the digits after it.
  const room =
    options.maxLength === undefined ? Infinity : options.maxLength - head.length - decimal.length;
  const digits = Math.max(0, Math.min(options.maxFractionDigits, room));
  const shownFraction = fraction.slice(0, digits).replace(/0+$/, '');
  return shownFraction ? `${head}${decimal}${shownFraction}` : head;
}
