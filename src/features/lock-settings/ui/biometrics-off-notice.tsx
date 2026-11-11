import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useAuthPrefsStore } from '@/entities/auth';
import { Button, Notice } from '@/shared/ui';

/** Shown after biometric unlock was switched off because the device lost its enrolment. */
export function BiometricsOffNotice() {
  const { t } = useTranslation();
  const hasNotice = useAuthPrefsStore((state) => state.hasBiometricsOffNotice);
  if (!hasNotice) return null;
  return (
    <View className="gap-2">
      <Notice tone="warning" title={t('settings.biometrics.turnedOffTitle')}>
        {t('settings.biometrics.turnedOffBody')}
      </Notice>
      <Button
        label={t('settings.biometrics.dismiss')}
        variant="ghost"
        onPress={() => useAuthPrefsStore.getState().setBiometricsOffNotice(false)}
      />
    </View>
  );
}
