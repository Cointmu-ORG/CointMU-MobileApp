import { useLocalSearchParams } from 'expo-router';

import { ReceiveCard } from '@/features/receive-qr';
import { FormScreen } from '@/shared/ui';

/** The active account's QR, or the one of the account a card's menu asked for. */
export function ReceivePage() {
  const { walletId, index } = useLocalSearchParams<{ walletId?: string; index?: string }>();
  const account = walletId === undefined ? undefined : { walletId, index: Number(index) };
  return (
    <FormScreen>
      <ReceiveCard account={account} />
    </FormScreen>
  );
}
