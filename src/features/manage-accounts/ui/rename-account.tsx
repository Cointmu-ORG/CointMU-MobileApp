import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useAccountLabel, type WalletAccount } from '@/entities/wallet';
import { Button, Input } from '@/shared/ui';

import { MAX_ACCOUNT_NAME_LENGTH, renameAccount } from '../model/accounts';

/** Name field for the active account. Keyed by the account so switching resets the field. */
export function RenameAccount({ account }: { account: WalletAccount }) {
  const { t } = useTranslation();
  const label = useAccountLabel();
  const [name, setName] = useState(account.name ?? '');
  const [isSaved, setIsSaved] = useState(false);
  const save = () => {
    renameAccount(account.index, name);
    setIsSaved(true);
  };

  return (
    <View className="gap-3">
      <Input
        label={t('settings.accounts.nameField', { account: label(account) })}
        placeholder={t('accounts.defaultName', { number: account.index + 1 })}
        value={name}
        onChangeText={(text) => {
          setName(text);
          setIsSaved(false);
        }}
        maxLength={MAX_ACCOUNT_NAME_LENGTH}
        returnKeyType="done"
        onSubmitEditing={save}
        status={isSaved ? 'success' : 'default'}
        message={isSaved ? t('settings.accounts.saved') : t('settings.accounts.nameHint')}
      />
      <Button
        label={t('settings.accounts.save')}
        variant="secondary"
        onPress={save}
        isDisabled={name.trim() === (account.name ?? '')}
      />
    </View>
  );
}
