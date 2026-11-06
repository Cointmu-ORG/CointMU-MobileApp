import { useTranslation } from 'react-i18next';

import { PlaceholderScreen } from '@/shared/ui';

export function SettingsPage() {
  const { t } = useTranslation();
  return <PlaceholderScreen title={t('settings.title')} />;
}
