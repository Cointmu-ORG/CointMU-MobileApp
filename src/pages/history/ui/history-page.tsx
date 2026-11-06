import { useTranslation } from 'react-i18next';

import { PlaceholderScreen } from '@/shared/ui';

export function HistoryPage() {
  const { t } = useTranslation();
  return <PlaceholderScreen title={t('history.title')} />;
}
