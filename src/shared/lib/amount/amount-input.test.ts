import { parseAmountInput } from './amount-input';

const DECIMALS = 18;
const ONE = 10n ** 18n;
const USDC_LIKE_DECIMALS = 6;

describe('parseAmountInput', () => {
  it.each([
    ['en-US', '1.5', ONE + ONE / 2n],
    ['id-ID', '1,5', ONE + ONE / 2n],
    // A dot on an id keypad (Android) is still the decimal point when it is the only separator.
    ['id-ID', '1.5', ONE + ONE / 2n],
    ['en-US', '1,5', ONE + ONE / 2n],
    ['en-US', '.5', ONE / 2n],
    ['en-US', '2.', 2n * ONE],
    ['en-US', ' 12 ', 12n * ONE],
    ['en-US', '0.000000000000000001', 1n],
  ])('%s parses %p', (locale, input, expected) => {
    expect(parseAmountInput(input, DECIMALS, locale)).toEqual({ ok: true, value: expected });
  });

  it.each([
    ['', 'empty'],
    ['   ', 'empty'],
    ['.', 'invalid'],
    ['1.000,5', 'invalid'],
    ['1,000.5', 'invalid'],
    ['1.2.3', 'invalid'],
    ['-1', 'invalid'],
    ['1e18', 'invalid'],
    ['abc', 'invalid'],
  ])('rejects %p as %s', (input, error) => {
    expect(parseAmountInput(input, DECIMALS, 'en-US')).toEqual({ ok: false, error });
  });

  it("rejects more fraction digits than the asset's decimals instead of rounding", () => {
    expect(parseAmountInput('0.1234567', USDC_LIKE_DECIMALS, 'en-US')).toEqual({
      ok: false,
      error: 'tooManyDecimals',
    });
    expect(parseAmountInput('0,123456', USDC_LIKE_DECIMALS, 'id-ID')).toEqual({
      ok: true,
      value: 123_456n,
    });
  });

  it('never goes through floating point', () => {
    // 0.1 + 0.2 style inputs stay exact in base units.
    expect(parseAmountInput('0.3', DECIMALS, 'en-US')).toEqual({
      ok: true,
      value: 3n * 10n ** 17n,
    });
  });
});
