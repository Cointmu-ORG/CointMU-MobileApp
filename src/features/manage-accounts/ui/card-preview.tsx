import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AccountIconTile, useAccountIconLabel, type AccountIcon } from '@/entities/wallet';
import { Text, useCardFill, type CardColorId } from '@/shared/ui';

type CardPreviewProps = {
  name: string;
  /** The line under the name: the short address, or the account the icon goes to. */
  detail: string;
  color: CardColorId;
  icon: AccountIcon;
};

/**
 * The card as it will look with the name, color and icon being chosen. It changes with every
 * pick, so the choice is seen before it is saved. Read out as one element.
 */
export function CardPreview({ name, detail, color, icon }: CardPreviewProps) {
  const { t } = useTranslation();
  const iconLabel = useAccountIconLabel();
  const fill = useCardFill()(color);

  return (
    <View
      className="min-h-28 w-44 justify-between gap-4 self-center rounded-card p-3"
      style={{ backgroundColor: fill }}
      accessible
      accessibilityRole="image"
      accessibilityLabel={t('wallets.icons.preview', { name, icon: iconLabel(icon) })}
    >
      <AccountIconTile icon={icon} />
      <View className="gap-1">
        <Text variant="label" tone="inverse" numberOfLines={1}>
          {name}
        </Text>
        <Text variant="caption" tone="inverse" numberOfLines={1}>
          {detail}
        </Text>
      </View>
    </View>
  );
}
