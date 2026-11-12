import Check from 'lucide-react-native/icons/check';
import ShieldOff from 'lucide-react-native/icons/shield-off';
import type { LucideIcon } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { ICON_SIZE, Text, useThemeColors } from '@/shared/ui';

const SENT_KEYS = ['error', 'stack', 'versions', 'activity'] as const;
const NEVER_SENT_KEYS = ['secrets', 'addresses', 'screen'] as const;

type ContentListProps = { title: string; icon: LucideIcon; items: readonly string[] };

function ContentList({ title, icon: Icon, items }: ContentListProps) {
  const colors = useThemeColors();
  return (
    <View className="gap-2">
      <Text variant="label" accessibilityRole="header">
        {title}
      </Text>
      {items.map((item) => (
        <View key={item} className="flex-row gap-3">
          <Icon size={ICON_SIZE.sm} color={colors.content.secondary} accessibilityElementsHidden />
          <Text variant="caption" tone="secondary" className="flex-1 text-sm">
            {item}
          </Text>
        </View>
      ))}
    </View>
  );
}

/** What a report holds and what is removed first; the same lists as the desktop app shows. */
export function ReportContents() {
  const { t } = useTranslation();
  return (
    <View className="gap-4">
      <ContentList
        title={t('settings.privacy.sentTitle')}
        icon={Check}
        items={SENT_KEYS.map((key) => t(`settings.privacy.sent.${key}`))}
      />
      <ContentList
        title={t('settings.privacy.neverSentTitle')}
        icon={ShieldOff}
        items={NEVER_SENT_KEYS.map((key) => t(`settings.privacy.neverSent.${key}`))}
      />
    </View>
  );
}
