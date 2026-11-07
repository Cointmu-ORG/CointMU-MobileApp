import { formatUnits } from 'ethers';

export type FormatAmountOptions = {
  readonly locale: string;
  readonly maxFractionDigits: number;
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
  const shownFraction = fraction.slice(0, options.maxFractionDigits).replace(/0+$/, '');
  const { group, decimal } = getSeparators(options.locale);
  const grouped = whole.replace(THOUSANDS_PATTERN, group);
  const sign = isNegative ? '-' : '';
  return shownFraction ? `${sign}${grouped}${decimal}${shownFraction}` : `${sign}${grouped}`;
}
