import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import type { WalletRecord } from '@/entities/wallet';
import { Button, Input, type CardColorId } from '@/shared/ui';

import { MAX_NAME_LENGTH, saveWalletDetails } from '../model/accounts';
import { ColorSwatches } from './color-swatches';

type WalletDetailsFormProps = {
  wallet: WalletRecord;
  submitLabel: string;
  onSaved: () => void;
};

/**
 * Name and color of a wallet: the last step of creating one, and its edit sheet. Both are local
 * and public. An empty name keeps the default ("Wallet N").
 */
export function WalletDetailsForm({ wallet, submitLabel, onSaved }: WalletDetailsFormProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(wallet.name ?? '');
  const [color, setColor] = useState<CardColorId>(wallet.color);

  const save = () => {
    saveWalletDetails(wallet, { name, color });
    onSaved();
  };

  return (
    <View className="gap-5">
      <Input
        label={t('wallets.details.name')}
        placeholder={t('wallets.defaultName', { number: wallet.number })}
        value={name}
        onChangeText={setName}
        maxLength={MAX_NAME_LENGTH}
        returnKeyType="done"
        message={t('wallets.details.nameHint')}
      />
      <ColorSwatches label={t('wallets.details.color')} value={color} onChange={setColor} />
      <Button label={submitLabel} onPress={save} />
    </View>
  );
}
