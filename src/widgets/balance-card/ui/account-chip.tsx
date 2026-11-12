import { router } from 'expo-router';
import ChevronDown from 'lucide-react-native/icons/chevron-down';
import { useTranslation } from 'react-i18next';

import { AccountBadge, useAccountLabel, useActiveAccount } from '@/entities/wallet';
import { ROUTES } from '@/shared/config';
import { ICON_SIZE, PressableSurface, SURFACE_PALETTE, Text, useThemeColors } from '@/shared/ui';

const BADGE_SIZE = 24;

/** Active account icon and name; opens the account switcher. */
export function AccountChip() {
  const colors = useThemeColors();
  const { t } = useTranslation();
  const label = useAccountLabel();
  const account = useActiveAccount();
  if (account === null) return null;
  return (
    <PressableSurface
      palette={SURFACE_PALETTE.ghost}
      className="-ml-2 min-h-11 flex-row items-center gap-2 self-start rounded-full px-2"
      onPress={() => router.push(ROUTES.accountSwitcher)}
      accessibilityRole="button"
      accessibilityLabel={label(account)}
      accessibilityHint={t('home.balance.switchAccount')}
    >
      <AccountBadge account={account} size={BADGE_SIZE} />
      <Text variant="label">{label(account)}</Text>
      <ChevronDown size={ICON_SIZE.sm} color={colors.content.secondary} />
    </PressableSurface>
  );
}
