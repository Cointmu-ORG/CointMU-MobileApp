import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useBalanceStore } from '@/entities/account';
import {
  findAsset,
  getAssetKey,
  NATIVE_ASSET,
  useTokenBalanceStore,
  type Asset,
} from '@/entities/asset';
import { classifySendError } from '@/entities/transaction';
import { useWalletStore } from '@/entities/wallet';
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
  const from = useWalletStore((state) => state.address) ?? '';
  const fields = useFields();
  const [errors, setErrors] = useState<FieldErrors>(NO_ERRORS);
  const toErrorText = useErrorText();
  const { busy, run } = useNetworkStep(setErrors);
  const balance = useAssetBalance(fields.asset);
  const nativeBalance = useBalanceStore((state) => state.wei);

  useEffect(() => {
    if (from !== '') void useBalanceStore.getState().refresh(from);
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
    return run('submit', async () => {
      const draft = await prepareDraft({
        asset: fields.asset,
        from,
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
