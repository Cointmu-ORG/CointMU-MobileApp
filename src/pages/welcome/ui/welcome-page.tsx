import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { ROUTES } from '@/shared/config';
import { BrandMark, Button, Screen, Text } from '@/shared/ui';

const LOGO_SIZE = 80;

export function WelcomePage() {
  const { t } = useTranslation();
  return (
    <Screen className="justify-between">
      <View className="flex-1 justify-center gap-6">
        <BrandMark size={LOGO_SIZE} />
        <View className="gap-2">
          <Text variant="title" accessibilityRole="header">
            {t('onboarding.welcome.title')}
          </Text>
          <Text tone="secondary">{t('onboarding.welcome.subtitle')}</Text>
        </View>
      </View>
      <View className="gap-3 pb-4">
        <Button label={t('onboarding.welcome.create')} onPress={() => router.push(ROUTES.create)} />
        <Button
          label={t('onboarding.welcome.import')}
          variant="secondary"
          onPress={() => router.push(ROUTES.import)}
        />
      </View>
    </Screen>
  );
}
