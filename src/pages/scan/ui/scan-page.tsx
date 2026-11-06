import { useTranslation } from 'react-i18next';

import { PlaceholderScreen } from '@/shared/ui';

export function ScanPage() {
  const { t } = useTranslation();
  return <PlaceholderScreen title={t('scan.title')} />;
}
