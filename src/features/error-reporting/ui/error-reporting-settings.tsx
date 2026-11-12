import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { isErrorReportingAvailable, QUEUE_MAX_REPORTS } from '@/shared/lib';
import { Notice, SettingsSection } from '@/shared/ui';

import { ErrorReportingSwitch } from './error-reporting-switch';
import { ReportContents } from './report-contents';

/** Settings > Privacy: the error reporting switch and what a report holds (D-77). */
export function ErrorReportingSettings() {
  const { t } = useTranslation();
  if (!isErrorReportingAvailable()) {
    return <Notice tone="info">{t('settings.privacy.notConfigured')}</Notice>;
  }
  return (
    <>
      <SettingsSection
        title={t('settings.privacy.reporting')}
        footer={t('settings.privacy.offline', { count: QUEUE_MAX_REPORTS })}
      >
        <ErrorReportingSwitch />
      </SettingsSection>
      <View className="px-1">
        <ReportContents />
      </View>
    </>
  );
}
