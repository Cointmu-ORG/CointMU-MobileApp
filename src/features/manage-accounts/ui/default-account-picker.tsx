import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useWalletStore } from '@/entities/wallet';
import { Text } from '@/shared/ui';

import { setDefaultAccount } from '../model/accounts';
import { AccountPickerList } from './account-picker-list';

/**
 * Settings > Default account for transfers (D-92): every usable account, with a check on the
 * default. A tap makes that account the default at once.
 */
export function DefaultAccountPicker() {
  const { t } = useTranslation();
  const defaultAccount = useWalletStore((state) => state.defaultAccount);

  return (
    <View className="flex-1 gap-4">
      <Text variant="caption" tone="secondary" className="text-sm">
        {t('settings.defaultAccount.description')}
      </Text>
      <AccountPickerList
        testID="default-account-list"
        selected={defaultAccount}
        onPick={setDefaultAccount}
      />
    </View>
  );
}
