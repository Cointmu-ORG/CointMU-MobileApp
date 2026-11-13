import Eye from 'lucide-react-native/icons/eye';
import EyeOff from 'lucide-react-native/icons/eye-off';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useAppearanceStore, usePrivacyRevealStore } from '@/shared/model';
import {
  BrandMark,
  ICON_SIZE,
  PressableSurface,
  SURFACE_PALETTE,
  Text,
  useThemeColors,
} from '@/shared/ui';

const MARK_SIZE = 32;

/**
 * The app's mark and name, and the eye. The eye flips "Hide balances", the same setting as in
 * Settings > Appearance and on the Wallets tab, so it holds on every screen until flipped back.
 */
export function HomeHeader() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const hidesBalances = useAppearanceStore((state) => state.hidesBalances);
  const Icon = hidesBalances ? Eye : EyeOff;

  const toggleHidden = () => {
    // A temporary reveal must not outlive the setting being switched.
    usePrivacyRevealStore.getState().hide();
    useAppearanceStore.getState().update({ hidesBalances: !hidesBalances });
  };

  return (
    <View className="flex-row items-center gap-2">
      <BrandMark size={MARK_SIZE} />
      <Text variant="heading" accessibilityRole="header" className="flex-1">
        {t('home.brand')}
      </Text>
      <PressableSurface
        palette={SURFACE_PALETTE.quiet}
        className="h-11 w-11 items-center justify-center rounded-full"
        onPress={toggleHidden}
        accessibilityRole="button"
        accessibilityLabel={t(hidesBalances ? 'home.balance.show' : 'home.balance.hide')}
      >
        <Icon size={ICON_SIZE.md} color={colors.content.DEFAULT} />
      </PressableSurface>
    </View>
  );
}
