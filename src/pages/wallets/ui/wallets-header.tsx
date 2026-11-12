import Eye from 'lucide-react-native/icons/eye';
import EyeOff from 'lucide-react-native/icons/eye-off';
import Plus from 'lucide-react-native/icons/plus';
import type { LucideIcon } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useAppearanceStore, usePrivacyRevealStore } from '@/shared/model';
import { ICON_SIZE, PressableSurface, SURFACE_PALETTE, Text, useThemeColors } from '@/shared/ui';

type HeaderButtonProps = { Icon: LucideIcon; label: string; onPress: () => void };

function HeaderButton({ Icon, label, onPress }: HeaderButtonProps) {
  const colors = useThemeColors();
  return (
    <PressableSurface
      palette={SURFACE_PALETTE.quiet}
      className="h-11 w-11 items-center justify-center rounded-full"
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Icon size={ICON_SIZE.md} color={colors.content.DEFAULT} />
    </PressableSurface>
  );
}

/**
 * Title, the eye and "+". The eye flips "Hide balances", the same setting as in
 * Settings > Appearance, so it holds everywhere until it is flipped back.
 */
export function WalletsHeader({ onAdd }: { onAdd: () => void }) {
  const { t } = useTranslation();
  const hidesBalances = useAppearanceStore((state) => state.hidesBalances);

  const toggleHidden = () => {
    // A temporary reveal from the home card must not outlive the setting being switched.
    usePrivacyRevealStore.getState().hide();
    useAppearanceStore.getState().update({ hidesBalances: !hidesBalances });
  };

  return (
    <View className="flex-row items-center gap-2">
      <Text variant="title" accessibilityRole="header" className="flex-1">
        {t('wallets.title')}
      </Text>
      <HeaderButton
        Icon={hidesBalances ? Eye : EyeOff}
        label={t(hidesBalances ? 'home.balance.show' : 'home.balance.hide')}
        onPress={toggleHidden}
      />
      <HeaderButton Icon={Plus} label={t('wallets.add.title')} onPress={onAdd} />
    </View>
  );
}
