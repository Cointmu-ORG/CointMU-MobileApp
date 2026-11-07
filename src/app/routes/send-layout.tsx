import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { colors } from '@/shared/ui';

import { SUB_SCREEN_HEADER } from './header-options';

/**
 * Send flow: form → review → result. The result screen has no back button or swipe-back: the
 * tx is already broadcast, so going "back" to the review must not invite a second send.
 */
export function SendLayout() {
  const { t } = useTranslation();
  return (
    <Stack
      screenOptions={{
        ...SUB_SCREEN_HEADER,
        contentStyle: { backgroundColor: colors.surface.DEFAULT },
      }}
    >
      <Stack.Screen name="index" options={{ headerTitle: t('send.title') }} />
      <Stack.Screen name="review" options={{ headerTitle: t('send.review.title') }} />
      <Stack.Screen
        name="result"
        options={{ headerTitle: '', headerBackVisible: false, gestureEnabled: false }}
      />
    </Stack>
  );
}
