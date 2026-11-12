import Bug from 'lucide-react-native/icons/bug';
import { useTranslation } from 'react-i18next';

import { getErrorReportingHost } from '@/shared/lib';
import { useErrorReportingStore } from '@/shared/model';
import { SettingsSwitchRow } from '@/shared/ui';

/**
 * The one error reporting switch, shown in the notice and in Settings > Privacy. The app-level
 * hook applies a change at once: off closes the SDK and deletes unsent reports (D-77).
 */
export function ErrorReportingSwitch() {
  const { t } = useTranslation();
  const isEnabled = useErrorReportingStore((state) => state.isEnabled);
  return (
    <SettingsSwitchRow
      icon={Bug}
      title={t('settings.privacy.toggleTitle')}
      description={t('settings.privacy.toggleDesc', { host: getErrorReportingHost() })}
      value={isEnabled}
      onValueChange={(next) => useErrorReportingStore.getState().setEnabled(next)}
    />
  );
}
