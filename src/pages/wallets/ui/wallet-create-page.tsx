import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useWalletStore } from '@/entities/wallet';
import { MnemonicBackup } from '@/features/backup-mnemonic';
import { CreateWalletProgress } from '@/features/create-wallet';
import { switchToAccount, WalletDetailsForm } from '@/features/manage-accounts';
import { MnemonicQuiz } from '@/features/verify-mnemonic';
import { ROUTES } from '@/shared/config';
import { Button, FormScreen, Text } from '@/shared/ui';

type Step = 'phrase' | 'quiz';

function StepHeading({ step }: { step: 'creating' | Step | 'details' }) {
  const { t } = useTranslation();
  return (
    <>
      <Text variant="title" accessibilityRole="header">
        {t(`wallets.create.${step}.title`)}
      </Text>
      <Text tone="secondary">{t(`wallets.create.${step}.subtitle`)}</Text>
    </>
  );
}

/**
 * Creating another wallet (D-78): generate, show the phrase once with screenshots blocked, the
 * 3-word quiz, then name, color and icon. The route may carry the id of a wallet whose backup was left
 * unfinished, to resume it. The phrase is only ever shown while the wallet's backup is pending:
 * a link to this screen for a finished wallet goes straight to its name and color, so it can
 * never reveal a phrase without the PIN.
 */
export function WalletCreatePage() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ walletId?: string }>();
  const [walletId, setWalletId] = useState<string | null>(params.walletId ?? null);
  const [step, setStep] = useState<Step>('phrase');
  const wallet = useWalletStore(
    (state) => state.wallets.find((candidate) => candidate.id === walletId) ?? null,
  );
  const onCreated = useCallback((id: string) => setWalletId(id), []);

  if (walletId === null) {
    return (
      <FormScreen>
        <StepHeading step="creating" />
        <CreateWalletProgress onCreated={onCreated} />
      </FormScreen>
    );
  }
  if (wallet === null) return null;

  if (!wallet.isBackupPending) {
    const finish = () => {
      switchToAccount({ walletId: wallet.id, index: 0 });
      router.dismissTo(ROUTES.wallets);
    };
    return (
      <FormScreen>
        <StepHeading step="details" />
        <WalletDetailsForm
          wallet={wallet}
          firstAccount={wallet.accounts[0]}
          submitLabel={t('wallets.create.details.finish')}
          onSaved={finish}
        />
      </FormScreen>
    );
  }
  if (step === 'quiz') {
    return (
      <FormScreen>
        <StepHeading step="quiz" />
        <MnemonicQuiz walletId={wallet.id} />
        <Button
          variant="ghost"
          label={t('wallets.create.quiz.back')}
          onPress={() => setStep('phrase')}
        />
      </FormScreen>
    );
  }
  return (
    <FormScreen>
      <StepHeading step="phrase" />
      <MnemonicBackup walletId={wallet.id} onConfirmed={() => setStep('quiz')} />
    </FormScreen>
  );
}
