import { useTranslation } from 'react-i18next';

import { PlaceholderScreen } from '@/shared/ui';

export function ReceivePage() {
  const { t } = useTranslation();
  return <PlaceholderScreen title={t('receive.title')} />;
}
