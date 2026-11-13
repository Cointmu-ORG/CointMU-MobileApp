import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView } from 'react-native';

import { ListRow, ListSection, Text } from '@/shared/ui';

import { useWalletLabel } from '../model/selectors';
import { isWalletUsable, type WalletRecord } from '../model/types';
import { useWalletStore } from '../model/wallet-store';
import { AccountBadge } from './account-icon';

const ROW_BADGE_SIZE = 36;

type WalletTargetProps = {
  /** The wallet the screen was opened for (its own page, a card menu): no picker. */
  walletId?: string;
  /** Also offers wallets that cannot be used (backup pending, unreadable), e.g. to remove one. */
  includesUnusable?: boolean;
  /** The question above the list, e.g. "Which wallet do you want to remove?". */
  prompt: string;
  /** The screen for the wallet that was named, is the only one, or was picked. */
  children: (wallet: WalletRecord) => ReactNode;
};

function WalletPicker(props: {
  wallets: readonly WalletRecord[];
  prompt: string;
  onPick: (walletId: string) => void;
}) {
  const { t } = useTranslation();
  const walletLabel = useWalletLabel();
  return (
    <ScrollView contentContainerClassName="gap-4 pb-8" testID="wallet-picker">
      <Text variant="heading" accessibilityRole="header">
        {props.prompt}
      </Text>
      <ListSection>
        {props.wallets.map((wallet) => {
          const first = wallet.accounts[0];
          return (
            <ListRow
              key={wallet.id}
              leading={first ? <AccountBadge account={first} size={ROW_BADGE_SIZE} /> : undefined}
              title={walletLabel(wallet)}
              description={t(`wallets.source.${wallet.source}`, { count: wallet.accounts.length })}
              onPress={() => props.onPick(wallet.id)}
            />
          );
        })}
      </ListSection>
    </ScrollView>
  );
}

/**
 * Decides which wallet a one-wallet action (reveal the phrase, show the key, remove) is for
 * (D-94), and never guesses: the wallet named by the caller, else the only wallet there is, else
 * the one the user picks from a short list (name, kind, number of accounts, the first card's
 * color and icon). Once a wallet was picked the choice is not replaced by another one: if that
 * wallet goes away (it was removed), nothing is shown.
 */
export function WalletTarget({ walletId, includesUnusable, prompt, children }: WalletTargetProps) {
  const wallets = useWalletStore((state) => state.wallets);
  const [pickedId, setPickedId] = useState<string | null>(null);

  const chosenId = walletId ?? pickedId;
  if (chosenId !== null) {
    const chosen = wallets.find((wallet) => wallet.id === chosenId);
    return chosen ? children(chosen) : null;
  }
  const candidates = includesUnusable ? wallets : wallets.filter(isWalletUsable);
  const only = candidates.length === 1 ? candidates[0] : undefined;
  if (only) return children(only);
  if (candidates.length === 0) return null;
  return <WalletPicker wallets={candidates} prompt={prompt} onPick={setPickedId} />;
}
