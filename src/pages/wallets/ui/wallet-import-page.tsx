import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useWalletLabel, useWalletStore } from '@/entities/wallet';
import { ImportWalletForm } from '@/features/import-wallet';
import { WalletDetailsForm } from '@/features/manage-accounts';
import { ROUTES } from '@/shared/config';
import { FormScreen, Notice, Text } from '@/shared/ui';

/**
 * Importing another wallet, or, with `recover` in the route, putting the phrase or key back for
 * one wallet whose key could not be read at startup (D-39 per wallet). Reuses the onboarding
 * import form; a duplicate, a full wallet list or the wrong wallet's secret is refused there.
 * A newly imported wallet then gets its name, color and card icon (D-84); it is already usable,
 * so leaving that step only keeps the defaults.
 */
export function WalletImportPage() {
  const { t } = useTranslation();
  const { recover } = useLocalSearchParams<{ recover?: string }>();
  const label = useWalletLabel();
  const [importedId, setImportedId] = useState<string | null>(null);
  const wallet = useWalletStore(
    (state) => state.wallets.find((candidate) => candidate.id === (recover ?? importedId)) ?? null,
  );
  const done = () => router.dismissTo(ROUTES.wallets);

  if (recover !== undefined) {
    if (wallet === null) return null;
    return (
      <FormScreen>
        <Text variant="title" accessibilityRole="header">
          {t('wallets.recover.title', { wallet: label(wallet) })}
        </Text>
        <Notice tone="warning">{t('wallets.recover.body')}</Notice>
        <ImportWalletForm target={{ kind: 'recover', walletId: wallet.id }} onImported={done} />
      </FormScreen>
    );
  }
  if (wallet !== null) {
    return (
      <FormScreen>
        <Text variant="title" accessibilityRole="header">
          {t('wallets.create.details.title')}
        </Text>
        <Text tone="secondary">{t('wallets.create.details.subtitle')}</Text>
        <WalletDetailsForm
          wallet={wallet}
          firstAccount={wallet.accounts[0]}
          submitLabel={t('wallets.create.details.finish')}
          onSaved={done}
        />
      </FormScreen>
    );
  }
  return (
    <FormScreen>
      <Text variant="title" accessibilityRole="header">
        {t('onboarding.import.title')}
      </Text>
      <Text tone="secondary">{t('wallets.import.subtitle')}</Text>
      <ImportWalletForm onImported={setImportedId} />
    </FormScreen>
  );
}
