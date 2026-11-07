import { formatUnits, parseUnits } from 'ethers';

import { getSeparators } from './amount';

export type AmountInputError = 'empty' | 'invalid' | 'tooManyDecimals';

export type AmountInputResult =
  | { readonly ok: true; readonly value: bigint }
  | { readonly ok: false; readonly error: AmountInputError };

// One optional decimal point, no thousands separators, digits on at least one side.
const PLAIN_DECIMAL = /^(\d*)(?:\.(\d*))?$/;
const SEPARATORS = /[.,]/g;

/**
 * Parses a typed amount into base units (wei) without floats.
 *
 * The decimal separator follows the locale (id: comma, en: dot), but the other one is accepted
 * too when it is the only separator, because decimal keypads differ by platform (Android often
 * shows a dot whatever the language). Thousands separators are not accepted: an input with more
 * than one separator is invalid rather than guessed. More fraction digits than `decimals` is an
 * error, never rounded.
 */
export function parseAmountInput(
  input: string,
  decimals: number,
  locale: string,
): AmountInputResult {
  const compact = input.replace(/\s/g, '');
  if (compact === '') return { ok: false, error: 'empty' };
  if ((compact.match(SEPARATORS) ?? []).length > 1) return { ok: false, error: 'invalid' };

  const { decimal } = getSeparators(locale);
  const normalized = compact.replace(decimal, '.').replace(',', '.');
  const match = PLAIN_DECIMAL.exec(normalized);
  const whole = match?.[1] ?? '';
  const fraction = match?.[2] ?? '';
  if (!match || (whole === '' && fraction === '')) return { ok: false, error: 'invalid' };
  if (fraction.length > decimals) return { ok: false, error: 'tooManyDecimals' };

  return { ok: true, value: parseUnits(`${whole || '0'}.${fraction || '0'}`, decimals) };
}

/**
 * The inverse, for filling an input (e.g. "Max"): exact digits, the locale's decimal separator,
 * no thousands separators and no trailing zeros, so parseAmountInput reads it back unchanged.
 */
export function formatAmountInput(value: bigint, decimals: number, locale: string): string {
  const [whole, fraction = ''] = formatUnits(value, decimals).split('.');
  const trimmed = fraction.replace(/0+$/, '');
  return trimmed === '' ? whole : `${whole}${getSeparators(locale).decimal}${trimmed}`;
}
