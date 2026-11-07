import { router } from 'expo-router';
import Lock from 'lucide-react-native/icons/lock';
import Trash2 from 'lucide-react-native/icons/trash-2';
import { useTranslation } from 'react-i18next';

import { lockNow } from '@/features/lock-settings';
import { ROUTES } from '@/shared/config';
import { ListRow, ListSection } from '@/shared/ui';

export function LogoutSection() {
  const { t } = useTranslation();
  return (
    <ListSection title={t('settings.logout.title')}>
      <ListRow
        icon={Lock}
        title={t('settings.logout.lockNow')}
        description={t('settings.logout.lockNowDesc')}
        onPress={lockNow}
      />
      <ListRow
        icon={Trash2}
        title={t('settings.logout.remove')}
        description={t('settings.logout.removeDesc')}
        onPress={() => router.push(ROUTES.removeWallet)}
        isDestructive
      />
    </ListSection>
  );
}
