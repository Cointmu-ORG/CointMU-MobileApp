import { useTranslation } from 'react-i18next';

import { NetworkSettings } from '@/features/select-network';
import { FormScreen, Text } from '@/shared/ui';

export function NetworkPage() {
  const { t } = useTranslation();
  return (
    <FormScreen>
      <Text tone="secondary">{t('settings.network.subtitle')}</Text>
      <NetworkSettings />
    </FormScreen>
  );
}
