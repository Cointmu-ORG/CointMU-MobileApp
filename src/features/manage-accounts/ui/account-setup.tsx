import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useAccountLabel, useWalletStore } from '@/entities/wallet';
import { shortenAddress } from '@/shared/lib';
import { Button, Input, Text } from '@/shared/ui';

import {
  MAX_NAME_LENGTH,
  renameAccount,
  setAccountColor,
  setAccountIcon,
  type AccountRef,
} from '../model/accounts';
import { CardPreview } from './card-preview';
import { ColorSwatches } from './color-swatches';
import { IconPicker } from './icon-picker';

type AccountSetupProps = { account: AccountRef; onDone: () => void };

/**
 * The step after "Add account": name, color and icon of the new card, with the card on top.
 * The account already exists, so leaving without Done only keeps the defaults.
 */
export function AccountSetup({ account: ref, onDone }: AccountSetupProps) {
  const { t } = useTranslation();
  const label = useAccountLabel();
  const account = useWalletStore((state) =>
    state.wallets
      .find((wallet) => wallet.id === ref.walletId)
      ?.accounts.find((candidate) => candidate.index === ref.index),
  );
  const [name, setName] = useState(account?.name ?? '');
  if (account === undefined) return null;

  const finish = () => {
    renameAccount(ref, name);
    onDone();
  };

  return (
    <View className="gap-5">
      <View className="gap-1">
        <Text variant="heading" accessibilityRole="header">
          {t('wallets.setup.title')}
        </Text>
        <Text tone="secondary">{t('wallets.setup.subtitle')}</Text>
      </View>
      <CardPreview
        name={name.trim() === '' ? label({ ...account, name: null }) : name.trim()}
        detail={shortenAddress(account.address)}
        color={account.color}
        icon={account.icon}
      />
      <Input
        label={t('wallets.menu.name')}
        placeholder={label({ ...account, name: null })}
        value={name}
        onChangeText={setName}
        maxLength={MAX_NAME_LENGTH}
        returnKeyType="done"
        message={t('wallets.menu.nameHint')}
      />
      <ColorSwatches
        label={t('wallets.menu.color')}
        value={account.color}
        onChange={(color) => setAccountColor(ref, color)}
      />
      <View className="gap-2">
        <Text variant="label" tone="secondary">
          {t('wallets.icons.label')}
        </Text>
        <IconPicker value={account.icon} onChange={(icon) => setAccountIcon(ref, icon)} />
      </View>
      <Button label={t('wallets.icons.done')} onPress={finish} />
    </View>
  );
}
