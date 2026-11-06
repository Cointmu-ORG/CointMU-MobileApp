import { formatAmount } from './amount';

const DECIMALS = 18;
const ONE = 10n ** 18n;
const EN = { locale: 'en-US', maxFractionDigits: 6 };

describe('formatAmount', () => {
  it('formats whole and fractional amounts with en separators', () => {
    expect(formatAmount(1234n * ONE + ONE / 2n, DECIMALS, EN)).toBe('1,234.5');
  });

  it('uses id-ID separators', () => {
    expect(formatAmount(1234n * ONE + ONE / 2n, DECIMALS, { ...EN, locale: 'id-ID' })).toBe(
      '1.234,5',
    );
  });

  it('truncates instead of rounding up', () => {
    expect(formatAmount(ONE - 1n, DECIMALS, EN)).toBe('0.999999');
  });

  it('formats zero and dust below the shown precision as 0', () => {
    expect(formatAmount(0n, DECIMALS, EN)).toBe('0');
    expect(formatAmount(1n, DECIMALS, EN)).toBe('0');
  });

  it('keeps precision beyond Number.MAX_SAFE_INTEGER', () => {
    expect(formatAmount(9_007_199_254_740_993n * ONE, DECIMALS, EN)).toBe('9,007,199,254,740,993');
  });

  it('handles negative values', () => {
    expect(formatAmount(-ONE, DECIMALS, EN)).toBe('-1');
  });
});
