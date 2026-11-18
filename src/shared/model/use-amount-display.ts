import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { formatAmount } from '../lib/amount';
import { useAppearanceStore } from './appearance-store';
import { usePrivacyRevealStore } from './privacy-store';

/** Shown instead of an amount while balances are hidden. The symbol next to it stays. */
export const AMOUNT_MASK = '••••';

/** Longest balance text (without the symbol) for a narrow slot: the send form's From box and the account picker. */
export const COMPACT_BALANCE_LENGTH = 12;

export type AmountDisplay = {
  /** True while amounts are masked (the setting is on and the eye was not tapped). */
  readonly isHidden: boolean;
  /**
   * A balance, with the decimals chosen in Settings > Appearance. `maxLength` shortens it by
   * decimals for a narrow slot (see `COMPACT_BALANCE_LENGTH`).
   */
  readonly formatBalance: (value: bigint, decimals: number, maxLength?: number) => string;
  /** The user's decimals, never masked: the amount of a transfer the user just made (receipt). */
  readonly formatPlain: (value: bigint, decimals: number) => string;
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

  const formatPlain = useCallback(
    (value: bigint, decimals: number, maxLength?: number) =>
      formatAmount(value, decimals, {
        locale,
        maxFractionDigits: balanceDecimals === 'full' ? decimals : balanceDecimals,
        maxLength,
      }),
    [locale, balanceDecimals],
  );
  const formatBalance = useCallback(
    (value: bigint, decimals: number, maxLength?: number) =>
      isHidden ? AMOUNT_MASK : formatPlain(value, decimals, maxLength),
    [isHidden, formatPlain],
  );
  const formatExact = useCallback(
    (value: bigint, decimals: number) =>
      isHidden
        ? AMOUNT_MASK
        : formatAmount(value, decimals, { locale, maxFractionDigits: decimals }),
    [isHidden, locale],
  );
  return { isHidden, formatBalance, formatPlain, formatExact };
}
