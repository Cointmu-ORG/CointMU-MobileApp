import { useTranslation } from 'react-i18next';

import { PlaceholderScreen } from '@/shared/ui';

export function SendPage() {
  const { t } = useTranslation();
  return <PlaceholderScreen title={t('send.title')} />;
}
