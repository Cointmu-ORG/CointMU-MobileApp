import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useAccountLabel, useDefaultAccount, useWalletStore } from '@/entities/wallet';
import { Button, Notice } from '@/shared/ui';

/**
 * Shown once after the default account moved by itself, because its wallet was removed or can
 * no longer be read (D-92). It names the new default and stays until it is dismissed.
 */
export function DefaultMovedNotice() {
  const { t } = useTranslation();
  const accountLabel = useAccountLabel();
  const hasNotice = useWalletStore((state) => state.hasDefaultMovedNotice);
  const account = useDefaultAccount();
  if (!hasNotice || account === null) return null;
  return (
    <View className="gap-2">
      <Notice tone="info" title={t('accounts.defaultMoved.title')}>
        {t('accounts.defaultMoved.body', { name: accountLabel(account) })}
      </Notice>
      <Button
        label={t('accounts.defaultMoved.dismiss')}
        variant="ghost"
        onPress={() => useWalletStore.getState().dismissDefaultMovedNotice()}
      />
    </View>
  );
}
