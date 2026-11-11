import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { formatAmount } from '../lib/amount';
import { useAppearanceStore } from './appearance-store';
import { usePrivacyRevealStore } from './privacy-store';

/** Shown instead of an amount while balances are hidden. The symbol next to it stays. */
export const AMOUNT_MASK = '••••';

export type AmountDisplay = {
  /** True while amounts are masked (the setting is on and the eye was not tapped). */
  readonly isHidden: boolean;
  /** A balance, with the decimals chosen in Settings > Appearance. */
  readonly formatBalance: (value: bigint, decimals: number) => string;
  /** An amount with every decimal (a transaction's value or fee). */
  readonly formatExact: (value: bigint, decimals: number) => string;
};

/** True while amounts must be masked. */
export function useIsAmountHidden(): boolean {
  const hidesBalances = useAppearanceStore((state) => state.hidesBalances);
  const isRevealed = usePrivacyRevealStore((state) => state.isRevealed);
  return hidesBalances && !isRevealed;
}

/**
 * The one way screens turn base units into text outside the send flow: locale-aware, with the
 * user's decimals, and masked while balances are hidden. The send form and review never use it,
 * so the user always sees the exact amount they are about to sign.
 */
export function useAmountDisplay(): AmountDisplay {
  const { i18n } = useTranslation();
  const locale = i18n.language;
  const balanceDecimals = useAppearanceStore((state) => state.balanceDecimals);
  const isHidden = useIsAmountHidden();

  const formatBalance = useCallback(
    (value: bigint, decimals: number) =>
      isHidden
        ? AMOUNT_MASK
        : formatAmount(value, decimals, {
            locale,
            maxFractionDigits: balanceDecimals === 'full' ? decimals : balanceDecimals,
          }),
    [isHidden, locale, balanceDecimals],
  );
  const formatExact = useCallback(
    (value: bigint, decimals: number) =>
      isHidden
        ? AMOUNT_MASK
        : formatAmount(value, decimals, { locale, maxFractionDigits: decimals }),
    [isHidden, locale],
  );
  return { isHidden, formatBalance, formatExact };
}
