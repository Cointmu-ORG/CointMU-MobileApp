import Ellipsis from 'lucide-react-native/icons/ellipsis';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AccountBadge, useAccountLabel, useActiveAccount } from '@/entities/wallet';
import { ICON_SIZE, PressableSurface, SURFACE_PALETTE, Text, useThemeColors } from '@/shared/ui';

const BADGE_SIZE = 28;

/** The account the card is about: its icon and name, and the "…" that opens its menu. */
export function AccountChip({ onMenu }: { onMenu?: () => void }) {
  const colors = useThemeColors();
  const { t } = useTranslation();
  const label = useAccountLabel();
  const account = useActiveAccount();
  if (account === null) return null;
  const name = label(account);
  return (
    <View className="min-h-11 flex-row items-center gap-2">
      <AccountBadge account={account} size={BADGE_SIZE} />
      <Text variant="label" className="flex-1" numberOfLines={1}>
        {name}
      </Text>
      {onMenu ? (
        <PressableSurface
          palette={SURFACE_PALETTE.ghost}
          className="-mr-2 h-11 w-11 items-center justify-center rounded-full"
          onPress={onMenu}
          accessibilityRole="button"
          accessibilityLabel={t('wallets.card.menu', { name })}
        >
          <Ellipsis size={ICON_SIZE.md} color={colors.content.DEFAULT} />
        </PressableSurface>
      ) : null}
    </View>
  );
}
