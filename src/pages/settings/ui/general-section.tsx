import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { LanguagePicker } from '@/features/change-language';
import { ListSection, Text } from '@/shared/ui';

export function GeneralSection() {
  const { t } = useTranslation();
  return (
    <ListSection title={t('settings.general.title')}>
      <View className="gap-3 px-4 py-3">
        <View className="gap-0.5">
          <Text variant="label">{t('settings.general.language')}</Text>
          <Text variant="caption" tone="secondary">
            {t('settings.general.languageDesc')}
          </Text>
        </View>
        <LanguagePicker />
      </View>
    </ListSection>
  );
}
