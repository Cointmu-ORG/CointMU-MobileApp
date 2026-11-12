import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import {
  useAccountLabel,
  type AccountIcon,
  type WalletAccount,
  type WalletRecord,
} from '@/entities/wallet';
import { Button, Input, Text, type CardColorId } from '@/shared/ui';

import { MAX_NAME_LENGTH, saveWalletDetails, setAccountIcon } from '../model/accounts';
import { CardPreview } from './card-preview';
import { ColorSwatches } from './color-swatches';
import { IconPicker } from './icon-picker';

type WalletDetailsFormProps = {
  wallet: WalletRecord;
  /**
   * The wallet's first account, right after creating or importing the wallet: the form then
   * also picks that card's icon and shows the card on top. The edit sheet leaves it out.
   */
  firstAccount?: WalletAccount;
  submitLabel: string;
  onSaved: () => void;
};

/**
 * Name and color of a wallet: the last step of creating or importing one (with the icon of its
 * first card, D-84), and its edit sheet. All are local and public. An empty name keeps the default ("Wallet N").
 */
export function WalletDetailsForm({
  wallet,
  firstAccount,
  submitLabel,
  onSaved,
}: WalletDetailsFormProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(wallet.name ?? '');
  const [color, setColor] = useState<CardColorId>(wallet.color);
  const [icon, setIcon] = useState<AccountIcon | null>(firstAccount?.icon ?? null);
  const accountLabel = useAccountLabel();
  const defaultName = t('wallets.defaultName', { number: wallet.number });

  const save = () => {
    saveWalletDetails(wallet, { name, color });
    if (firstAccount && icon) {
      setAccountIcon({ walletId: wallet.id, index: firstAccount.index }, icon);
    }
    onSaved();
  };

  return (
    <View className="gap-5">
      {firstAccount && icon ? (
        <CardPreview
          name={name.trim() === '' ? defaultName : name.trim()}
          detail={accountLabel(firstAccount)}
          color={color}
          icon={icon}
        />
      ) : null}
      <Input
        label={t('wallets.details.name')}
        placeholder={defaultName}
        value={name}
        onChangeText={setName}
        maxLength={MAX_NAME_LENGTH}
        returnKeyType="done"
        message={t('wallets.details.nameHint')}
      />
      <ColorSwatches label={t('wallets.details.color')} value={color} onChange={setColor} />
      {icon ? (
        <View className="gap-2">
          <Text variant="label" tone="secondary">
            {t('wallets.icons.label')}
          </Text>
          <IconPicker value={icon} onChange={setIcon} />
        </View>
      ) : null}
      <Button label={submitLabel} onPress={save} />
    </View>
  );
}
