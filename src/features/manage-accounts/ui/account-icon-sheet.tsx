import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useAccountLabel, useWalletStore } from '@/entities/wallet';
import { shortenAddress } from '@/shared/lib';
import { Button, Text } from '@/shared/ui';

import { setAccountIcon, type AccountRef } from '../model/accounts';
import { CardPreview } from './card-preview';
import { IconPicker } from './icon-picker';

type AccountIconSheetProps = { account: AccountRef; onDone: () => void };

/** "Change icon" from a card's menu: the card as it will look, and the picker. A pick is saved at once. */
export function AccountIconSheet({ account: ref, onDone }: AccountIconSheetProps) {
  const { t } = useTranslation();
  const label = useAccountLabel();
  const account = useWalletStore((state) =>
    state.wallets
      .find((wallet) => wallet.id === ref.walletId)
      ?.accounts.find((candidate) => candidate.index === ref.index),
  );
  if (account === undefined) return null;

  return (
    <View className="gap-5">
      <Text variant="heading" accessibilityRole="header">
        {t('wallets.icons.title')}
      </Text>
      <CardPreview
        name={label(account)}
        detail={shortenAddress(account.address)}
        color={account.color}
        icon={account.icon}
      />
      <IconPicker value={account.icon} onChange={(icon) => setAccountIcon(ref, icon)} />
      <Button label={t('wallets.icons.done')} onPress={onDone} />
    </View>
  );
}
