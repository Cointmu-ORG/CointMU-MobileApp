import type { Asset } from '@/entities/asset';
import { checkAddress, parseAmountInput, type AmountInputError } from '@/shared/lib';

export type FormErrorCode = {
  readonly to: 'invalid' | 'badChecksum' | null;
  readonly amount: AmountInputError | 'zero' | null;
};

export type FormCheck =
  | { readonly ok: true; readonly to: string; readonly amount: bigint }
  | { readonly ok: false; readonly errors: FormErrorCode };

/** Validates the typed recipient and amount. Pure; the UI maps the codes to copy. */
export function validateSendForm(input: {
  readonly asset: Asset;
  readonly toInput: string;
  readonly amountInput: string;
  readonly locale: string;
}): FormCheck {
  const to = checkAddress(input.toInput);
  const amount = parseAmountInput(input.amountInput, input.asset.decimals, input.locale);
  const amountError = !amount.ok ? amount.error : amount.value === 0n ? 'zero' : null;
  if (to.ok && amount.ok && amountError === null) {
    return { ok: true, to: to.address, amount: amount.value };
  }
  return { ok: false, errors: { to: to.ok ? null : to.error, amount: amountError } };
}
