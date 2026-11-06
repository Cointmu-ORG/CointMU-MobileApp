import ShieldAlert from 'lucide-react-native/icons/shield-alert';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { colors, ICON_SIZE, Text } from '@/shared/ui';

export function PhraseWarning() {
  const { t } = useTranslation();
  return (
    <View className="flex-row gap-3 rounded-card border border-warning bg-warning-soft p-4">
      <ShieldAlert size={ICON_SIZE.lg} color={colors.warning.strong} />
      <Text variant="label" className="flex-1">
        {t('settings.recoveryPhrase.warning')}
      </Text>
    </View>
  );
}
