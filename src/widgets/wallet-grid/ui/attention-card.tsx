import FileClock from 'lucide-react-native/icons/file-clock';
import ShieldAlert from 'lucide-react-native/icons/shield-alert';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Button, ICON_SIZE, Text, useThemeColors } from '@/shared/ui';

type AttentionCardProps = {
  /** `backup`: a created wallet whose quiz is not passed. `recovery`: its key is unreadable. */
  kind: 'backup' | 'recovery';
  onResolve: () => void;
  onRemove: () => void;
};

const ICONS = { backup: FileClock, recovery: ShieldAlert } as const;

/**
 * Shown in place of a wallet's cards while it cannot be used: what is wrong, in words and with an
 * icon, and the two ways out (finish or restore it, or remove it).
 */
export function AttentionCard({ kind, onResolve, onRemove }: AttentionCardProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const Icon = ICONS[kind];

  return (
    <View
      className="gap-3 rounded-card border border-warning bg-warning-soft p-4"
      accessibilityRole="alert"
    >
      <View className="flex-row items-center gap-2">
        <Icon size={ICON_SIZE.md} color={colors.warning.strong} accessibilityElementsHidden />
        <Text variant="label" className="flex-1">
          {t(`wallets.attention.${kind}.title`)}
        </Text>
      </View>
      <Text variant="caption" className="text-sm">
        {t(`wallets.attention.${kind}.body`)}
      </Text>
      <Button label={t(`wallets.attention.${kind}.resolve`)} onPress={onResolve} />
      <Button variant="ghost" label={t('wallets.attention.remove')} onPress={onRemove} />
    </View>
  );
}
