import ShieldAlert from 'lucide-react-native/icons/shield-alert';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';

import { useWalletStore } from '@/entities/wallet';
import { ImportWalletForm } from '@/features/import-wallet';
import { Button, colors, Screen, Text } from '@/shared/ui';

const ICON_SIZE = 28;

/**
 * D-39: shown after unreadable wallet data was wiped at startup. A successful import moves the
 * wallet to PIN setup; "create new" leaves recovery for users without a backup.
 */
export function RecoverPage() {
  const { t } = useTranslation();
  return (
    <Screen>
      <ScrollView contentContainerClassName="gap-6 pb-8" keyboardShouldPersistTaps="handled">
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
      </ScrollView>
    </Screen>
  );
}
