import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useBalanceStore } from '@/entities/account';
import {
  findAsset,
  getAssetKey,
  getVisibleTokens,
  NATIVE_ASSET,
  useTokenBalanceStore,
  type Asset,
} from '@/entities/asset';
import { getProvider } from '@/entities/network';
import { classifySendError } from '@/entities/transaction';
import { useActiveAccount } from '@/entities/wallet';
import { ROUTES } from '@/shared/config';
import { checkAddress, formatAmountInput, logger } from '@/shared/lib';

import { validateSendForm, type FormErrorCode } from '../lib/validate-form';
import { computeMax, prepareDraft } from '../model/prepare-send';
import { useSendFlowStore, type SendPrefill } from '../model/send-flow-store';

type FieldErrors = { to: string | null; amount: string | null; form: string | null };
const NO_ERRORS: FieldErrors = { to: null, amount: null, form: null };

export function useAssetBalance(asset: Asset): bigint | null {
  const native = useBalanceStore((state) => state.wei);
  const token = useTokenBalanceStore((state) => state.balances[getAssetKey(asset)]);
  return asset.kind === 'native' ? native : (token ?? null);
}

type Fields = { asset: Asset; toInput: string; amountInput: string };

function fieldsFrom(prefill: SendPrefill, locale: string): Fields {
  const asset = findAsset(prefill.assetKey) ?? NATIVE_ASSET;
  const { amount } = prefill;
  return {
    asset,
    toInput: prefill.to,
    amountInput: amount === null ? '' : formatAmountInput(amount, asset.decimals, locale),
  };
}

/**
 * Form field state. A scanned payment request (it never sends) fills the fields: one waiting
 * when the form opens is read by the initial state, a later one (scan from this form) arrives
 * through the store subscription. Either way it is consumed once.
 */
function useFields() {
  const { i18n } = useTranslation();
  const [initial] = useState(() => {
    const { prefill } = useSendFlowStore.getState();
    return prefill === null ? null : fieldsFrom(prefill, i18n.language);
  });
  const [asset, setAsset] = useState<Asset>(initial?.asset ?? NATIVE_ASSET);
  const [toInput, setToInput] = useState(initial?.toInput ?? '');
  const [amountInput, setAmountInput] = useState(initial?.amountInput ?? '');

  useEffect(() => {
    useSendFlowStore.getState().setPrefill(null);
    return useSendFlowStore.subscribe(({ prefill }) => {
      if (prefill === null) return;
      const next = fieldsFrom(prefill, i18n.language);
      useSendFlowStore.getState().setPrefill(null);
      setAsset(next.asset);
      setToInput(next.toInput);
      setAmountInput(next.amountInput);
    });
  }, [i18n.language]);

  return { asset, setAsset, toInput, setToInput, amountInput, setAmountInput };
}

function useErrorText() {
  const { t } = useTranslation();
  return useCallback(
    (codes: FormErrorCode, asset: Asset): FieldErrors => ({
      to: codes.to && t(`send.form.errors.${codes.to}`),
      amount:
        codes.amount &&
        t(`send.form.errors.${codes.amount}`, { symbol: asset.symbol, decimals: asset.decimals }),
      form: null,
    }),
    [t],
  );
}

/** Runs a network step with the busy flag and a friendly error; never throws. */
function useNetworkStep(setErrors: (update: (current: FieldErrors) => FieldErrors) => void) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState<'max' | 'submit' | null>(null);
  const run = async (kind: 'max' | 'submit', step: () => Promise<void>) => {
    setBusy(kind);
    try {
      await step();
    } catch (error) {
      logger.warn('Preparing a send failed', { error });
      setErrors((current) => ({ ...current, form: t(`send.errors.${classifySendError(error)}`) }));
    } finally {
      setBusy(null);
    }
  };
  return { busy, run };
}

export function useSendForm() {
  const { i18n } = useTranslation();
  // "From" is the account in use: the default from Home, or the account Send was opened from.
  // Picking another one in the selector changes this send only, never the default (D-92).
  const source = useActiveAccount();
  const from = source?.address ?? '';
  const fields = useFields();
  const [errors, setErrors] = useState<FieldErrors>(NO_ERRORS);
  const toErrorText = useErrorText();
  const { busy, run } = useNetworkStep(setErrors);
  const balance = useAssetBalance(fields.asset);
  const nativeBalance = useBalanceStore((state) => state.wei);

  // A new source: whatever was checked against the old one (not enough funds, a fee quote) no
  // longer holds, and its balances are loaded. The fee is quoted again on Max and on Review.
  const [checkedFrom, setCheckedFrom] = useState(from);
  if (checkedFrom !== from) {
    setCheckedFrom(from);
    setErrors(NO_ERRORS);
  }
  useEffect(() => {
    if (from === '') return;
    void useBalanceStore.getState().refresh(from);
    void useTokenBalanceStore.getState().refresh(getProvider(), from, getVisibleTokens());
  }, [from]);

  const fillMax = () =>
    run('max', async () => {
      if (nativeBalance === null) return;
      const to = checkAddress(fields.toInput);
      const { asset } = fields;
      const tokenBalance = balance;
      const max = await computeMax({
        asset,
        from,
        to: to.ok ? to.address : null,
        nativeBalance,
        tokenBalance,
      });
      fields.setAmountInput(formatAmountInput(max, asset.decimals, i18n.language));
      setErrors(NO_ERRORS);
    });

  const submit = () => {
    const check = validateSendForm({ ...fields, locale: i18n.language });
    if (!check.ok) return setErrors(toErrorText(check.errors, fields.asset));
    setErrors(NO_ERRORS);
    if (source === null) return undefined;
    const { walletId, index, address } = source;
    return run('submit', async () => {
      const draft = await prepareDraft({
        asset: fields.asset,
        from: { walletId, index, address },
        to: check.to,
        amount: check.amount,
      });
      useSendFlowStore.getState().setDraft(draft);
      router.push(ROUTES.sendReview);
    });
  };

  const clearing =
    (setter: (value: string) => void, field: keyof FieldErrors) => (value: string) => {
      setter(value);
      setErrors((current) => ({ ...current, [field]: null, form: null }));
    };

  return {
    ...fields,
    source,
    selectAsset: (next: Asset) => {
      fields.setAsset(next);
      setErrors(NO_ERRORS);
    },
    setToInput: clearing(fields.setToInput, 'to'),
    setAmountInput: clearing(fields.setAmountInput, 'amount'),
    errors,
    balance,
    isMaxLoading: busy === 'max',
    isSubmitting: busy === 'submit',
    fillMax: () => void fillMax(),
    submit: () => void submit(),
  };
}
