import { router } from 'expo-router';
import KeyRound from 'lucide-react-native/icons/key-round';
import ScrollText from 'lucide-react-native/icons/scroll-text';
import { useTranslation } from 'react-i18next';

import { AutoLockPicker, BiometricsSwitch } from '@/features/lock-settings';
import { ROUTES } from '@/shared/config';
import { ListRow, ListSection } from '@/shared/ui';

export function SecuritySection() {
  const { t } = useTranslation();
  return (
    <ListSection title={t('settings.security.title')}>
      <ListRow
        icon={KeyRound}
        title={t('settings.security.changePin')}
        onPress={() => router.push(ROUTES.changePin)}
      />
      <BiometricsSwitch />
      <AutoLockPicker />
      <ListRow
        icon={ScrollText}
        title={t('settings.security.recoveryPhraseTitle')}
        description={t('settings.security.recoveryPhraseDesc')}
        onPress={() => router.push(ROUTES.recoveryPhrase)}
      />
    </ListSection>
  );
}
