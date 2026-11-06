import HistoryIcon from 'lucide-react-native/icons/history';
import { useTranslation } from 'react-i18next';

import { PlaceholderScreen } from '@/shared/ui';

export function HistoryPage() {
  const { t } = useTranslation();
  return <PlaceholderScreen title={t('history.title')} icon={HistoryIcon} />;
}
