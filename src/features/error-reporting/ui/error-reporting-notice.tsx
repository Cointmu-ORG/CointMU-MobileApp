import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { getErrorReportingHost } from '@/shared/lib';
import { useErrorReportingStore } from '@/shared/model';
import { Button, SettingsSection, Text } from '@/shared/ui';

import { ErrorReportingSwitch } from './error-reporting-switch';
import { ReportContents } from './report-contents';

/**
 * The one-time notice (D-77): what a report holds, where it goes, and the switch. Shown after
 * the PIN is set, and on the next unlock for installs that predate it. Nothing is sent until it
 * is acknowledged; "Got it" keeps whatever the switch says.
 */
export function ErrorReportingNotice() {
  const { t } = useTranslation();
  return (
    <View className="gap-6">
      <View className="gap-2">
        <Text variant="title" accessibilityRole="header">
          {t('settings.privacy.notice.title')}
        </Text>
        <Text tone="secondary">{t('settings.privacy.notice.what')}</Text>
        <Text tone="secondary">
          {t('settings.privacy.notice.where', { host: getErrorReportingHost() })}
        </Text>
      </View>
      <ReportContents />
      <SettingsSection footer={t('settings.privacy.notice.howToDisable')}>
        <ErrorReportingSwitch />
      </SettingsSection>
      <Button
        label={t('settings.privacy.notice.acknowledge')}
        onPress={() => useErrorReportingStore.getState().acknowledgeNotice()}
      />
    </View>
  );
}
