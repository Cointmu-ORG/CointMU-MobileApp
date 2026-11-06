import ShieldAlert from 'lucide-react-native/icons/shield-alert';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useWalletStore } from '@/entities/wallet';
import { ImportWalletForm } from '@/features/import-wallet';
import { Button, colors, FormScreen, Text } from '@/shared/ui';

const ICON_SIZE = 28;

/**
 * D-39: shown after unreadable wallet data was wiped at startup. A successful import moves the
 * wallet to PIN setup; "create new" leaves recovery for users without a backup.
 */
export function RecoverPage() {
  const { t } = useTranslation();
  return (
    <FormScreen>
      <View className="h-14 w-14 items-center justify-center rounded-card bg-warning-soft">
        <ShieldAlert size={ICON_SIZE} color={colors.warning.DEFAULT} />
      </View>
      <View className="gap-2">
        <Text variant="title" accessibilityRole="header">
          {t('onboarding.recover.title')}
        </Text>
        <Text tone="secondary">{t('onboarding.recover.body')}</Text>
      </View>
      <ImportWalletForm />
      <Button
        label={t('onboarding.recover.startOver')}
        variant="ghost"
        onPress={() => useWalletStore.getState().dismissRecovery()}
      />
    </FormScreen>
  );
}
