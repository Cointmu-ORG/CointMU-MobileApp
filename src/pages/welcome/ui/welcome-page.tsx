import { router } from 'expo-router';
import Wallet from 'lucide-react-native/icons/wallet';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { ROUTES } from '@/shared/config';
import { Button, colors, Screen, Text } from '@/shared/ui';

const LOGO_ICON_SIZE = 40;

export function WelcomePage() {
  const { t } = useTranslation();
  return (
    <Screen className="justify-between">
      <View className="flex-1 justify-center gap-6">
        <View className="h-20 w-20 items-center justify-center rounded-card bg-primary-600">
          <Wallet size={LOGO_ICON_SIZE} color={colors.content.inverse} />
        </View>
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
