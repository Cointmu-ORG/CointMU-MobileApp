import { act, renderHook } from '@testing-library/react-native';

import { i18n } from '../i18n';
import { DEFAULT_APPEARANCE } from './appearance-prefs';
import { useAppearanceStore } from './appearance-store';
import { REVEAL_DURATION_MS, usePrivacyRevealStore } from './privacy-store';
import { AMOUNT_MASK, useAmountDisplay } from './use-amount-display';

const DECIMALS = 18;
const AMOUNT = 1_234_567_891_234_567_891n; // 1.234567891234567891

beforeEach(async () => {
  await i18n.changeLanguage('en');
  useAppearanceStore.setState(DEFAULT_APPEARANCE);
  usePrivacyRevealStore.getState().hide();
});

describe('useAmountDisplay', () => {
  it('shows balances with the chosen decimals and exact amounts in full', async () => {
    const { result } = await renderHook(() => useAmountDisplay());
    expect(result.current.formatBalance(AMOUNT, DECIMALS)).toBe('1.234567');

    await act(() => useAppearanceStore.getState().update({ balanceDecimals: 2 }));
    expect(result.current.formatBalance(AMOUNT, DECIMALS)).toBe('1.23');

    await act(() => useAppearanceStore.getState().update({ balanceDecimals: 'full' }));
    expect(result.current.formatBalance(AMOUNT, DECIMALS)).toBe('1.234567891234567891');
    expect(result.current.formatExact(AMOUNT, DECIMALS)).toBe('1.234567891234567891');
  });

  it('masks every amount while balances are hidden', async () => {
    const { result } = await renderHook(() => useAmountDisplay());
    await act(() => useAppearanceStore.getState().update({ hidesBalances: true }));

    expect(result.current.isHidden).toBe(true);
    expect(result.current.formatBalance(AMOUNT, DECIMALS)).toBe(AMOUNT_MASK);
    expect(result.current.formatExact(AMOUNT, DECIMALS)).toBe(AMOUNT_MASK);
  });

  it('reveals for a short while after the eye is tapped, then hides again', async () => {
    jest.useFakeTimers();
    try {
      const { result } = await renderHook(() => useAmountDisplay());
      await act(() => useAppearanceStore.getState().update({ hidesBalances: true }));

      await act(() => usePrivacyRevealStore.getState().revealTemporarily());
      expect(result.current.formatBalance(AMOUNT, DECIMALS)).toBe('1.234567');

      await act(() => jest.advanceTimersByTime(REVEAL_DURATION_MS));
      expect(result.current.formatBalance(AMOUNT, DECIMALS)).toBe(AMOUNT_MASK);
    } finally {
      jest.useRealTimers();
    }
  });

  it('hides again at once when asked to (the app left the foreground)', async () => {
    const { result } = await renderHook(() => useAmountDisplay());
    await act(() => useAppearanceStore.getState().update({ hidesBalances: true }));
    await act(() => usePrivacyRevealStore.getState().revealTemporarily());
    await act(() => usePrivacyRevealStore.getState().hide());
    expect(result.current.isHidden).toBe(true);
  });
});
