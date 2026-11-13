import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { WalletTarget } from '@/entities/wallet';
import { RevealPhrase } from '@/features/reveal-mnemonic';
import { Screen } from '@/shared/ui';

/** The recovery phrase of the wallet in the route, of the only wallet, or of the one picked. */
export function RecoveryPhrasePage() {
  const { t } = useTranslation();
  const { walletId } = useLocalSearchParams<{ walletId?: string }>();
  return (
    <Screen>
      <WalletTarget walletId={walletId} prompt={t('settings.recoveryPhrase.pick')}>
        {(wallet) => <RevealPhrase walletId={wallet.id} />}
      </WalletTarget>
    </Screen>
  );
}
