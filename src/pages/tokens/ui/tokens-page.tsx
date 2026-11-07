import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AddTokenForm, TokenList } from '@/features/manage-tokens';
import { FormScreen, Text } from '@/shared/ui';

export function TokensPage() {
  const { t } = useTranslation();
  return (
    <FormScreen>
      <Text tone="secondary">{t('tokens.subtitle')}</Text>
      <View className="gap-3">
        <Text variant="heading" accessibilityRole="header">
          {t('tokens.addTitle')}
        </Text>
        <AddTokenForm />
      </View>
      <View className="gap-1">
        <Text variant="heading" accessibilityRole="header">
          {t('tokens.listTitle')}
        </Text>
        <TokenList />
      </View>
    </FormScreen>
  );
}
