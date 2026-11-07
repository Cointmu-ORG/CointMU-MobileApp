import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useBalanceStore } from '@/entities/account';
import { PinPrompt } from '@/entities/auth';
import { useActiveAccount } from '@/entities/wallet';
import { ROUTES } from '@/shared/config';
import { Button, Notice, Spinner, Text } from '@/shared/ui';

import { checkFunds } from '../lib/send-math';
import { useSendFlowStore, type SendDraft } from '../model/send-flow-store';
import { sendTransaction, type SendStage } from '../model/send-transaction';
import { ReviewDetails } from './review-details';
import { useAssetBalance } from './use-send-form';
import { useFreshQuote } from './use-fresh-quote';

type Step = { name: 'review' } | { name: 'auth' } | { name: 'sending'; stage: SendStage };

function useFundsCheck(draft: SendDraft | null) {
  const nativeBalance = useBalanceStore((state) => state.wei);
  const tokenBalance = useAssetBalance(draft?.asset ?? { kind: 'native', symbol: '', decimals: 0 });
  if (draft === null || nativeBalance === null) return 'unknown' as const;
  return checkFunds({ ...draft, maxFee: draft.quote.maxFee, nativeBalance, tokenBalance });
}

function Warnings({ draft }: { draft: SendDraft }) {
  const { t } = useTranslation();
  return (
    <>
      {draft.isSelfSend ? <Notice tone="warning">{t('send.review.selfWarning')}</Notice> : null}
      {draft.isContractRecipient ? (
        <Notice tone="warning">{t('send.review.contractWarning')}</Notice>
      ) : null}
    </>
  );
}

/** Step 2 of Send. Authentication comes right before signing, every time (D-15). */
export function SendReview() {
  const { t } = useTranslation();
  const account = useActiveAccount();
  const { draft, isRefreshing, error, ensureFresh } = useFreshQuote(account?.address ?? '');
  const funds = useFundsCheck(draft);
  const [step, setStep] = useState<Step>({ name: 'review' });

  if (draft === null || account === null) {
    return <Notice tone="danger">{t('send.review.missing')}</Notice>;
  }

  const confirm = async () => {
    if ((await ensureFresh()) !== null) setStep({ name: 'auth' });
  };

  const send = async () => {
    const current = useSendFlowStore.getState().draft ?? draft;
    const outcome = await sendTransaction({
      draft: current,
      account,
      onStage: (stage) => setStep({ name: 'sending', stage }),
    });
    useSendFlowStore.getState().setOutcome(outcome);
    router.replace(ROUTES.sendResult);
  };

  if (step.name === 'auth') {
    return (
      <PinPrompt
        title={t('send.review.authTitle')}
        subtitle={t('send.review.authSubtitle')}
        biometrics={{ prompt: t('send.review.authTitle') }}
        onVerified={() => void send()}
      />
    );
  }
  if (step.name === 'sending') {
    return (
      <View className="flex-1 items-center justify-center gap-6">
        <Spinner label={t(`send.stage.${step.stage}`)} />
        <Text tone="secondary" accessibilityLiveRegion="polite">
          {t(`send.stage.${step.stage}`)}
        </Text>
      </View>
    );
  }

  const blocker = error ?? (funds === 'ok' ? null : funds === 'unknown' ? 'balanceUnknown' : funds);
  return (
    <View className="gap-4">
      <ReviewDetails draft={draft} />
      <Warnings draft={draft} />
      {blocker ? <Notice tone="danger">{t(`send.errors.${blocker}`)}</Notice> : null}
      <Button
        label={t('send.review.confirm')}
        onPress={() => void confirm()}
        isLoading={isRefreshing}
        isDisabled={blocker !== null}
      />
    </View>
  );
}
