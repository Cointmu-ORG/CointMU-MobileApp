import { useTranslation } from 'react-i18next';

import { Screen } from './screen';
import { Text } from './text';

/** Stub screen for routes that exist but are not built yet. */
export function PlaceholderScreen({ title }: { title: string }) {
  const { t } = useTranslation();
  return (
    <Screen className="items-center justify-center gap-2">
      <Text variant="heading" accessibilityRole="header">
        {title}
      </Text>
      <Text tone="secondary">{t('common.comingSoon')}</Text>
    </Screen>
  );
}
