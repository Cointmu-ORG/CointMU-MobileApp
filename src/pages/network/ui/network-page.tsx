import { useTranslation } from 'react-i18next';
import { RefreshControl } from 'react-native';

import { NetworkSettings, useNodeChecks } from '@/features/select-network';
import { FormScreen, Text, useThemeColors } from '@/shared/ui';

/** Settings > Network. Opening the screen pings every node; pulling down pings them again. */
export function NetworkPage() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const checks = useNodeChecks();
  return (
    <FormScreen
      refreshControl={
        <RefreshControl
          refreshing={checks.isChecking}
          onRefresh={() => void checks.checkAll()}
          tintColor={colors.accent.DEFAULT}
          colors={[colors.accent.DEFAULT]}
          progressBackgroundColor={colors.surface.card}
        />
      }
    >
      <Text tone="secondary">{t('settings.network.subtitle')}</Text>
      <NetworkSettings checks={checks} />
    </FormScreen>
  );
}
