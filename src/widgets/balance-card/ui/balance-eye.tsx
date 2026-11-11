import Eye from 'lucide-react-native/icons/eye';
import EyeOff from 'lucide-react-native/icons/eye-off';
import { useTranslation } from 'react-i18next';

import { useAppearanceStore, usePrivacyRevealStore } from '@/shared/model';
import { ICON_SIZE, PressableSurface, SURFACE_PALETTE, useThemeColors } from '@/shared/ui';

/**
 * Shown only while "Hide balances" is on. A tap shows the amounts for a short while; another
 * tap, the timer, or leaving the app hides them again. The setting itself stays on.
 */
export function BalanceEye() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const hidesBalances = useAppearanceStore((state) => state.hidesBalances);
  const isRevealed = usePrivacyRevealStore((state) => state.isRevealed);
  if (!hidesBalances) return null;

  const Icon = isRevealed ? EyeOff : Eye;
  const toggle = () => {
    const { hide, revealTemporarily } = usePrivacyRevealStore.getState();
    if (isRevealed) hide();
    else revealTemporarily();
  };
  return (
    <PressableSurface
      palette={SURFACE_PALETTE.ghost}
      className="h-11 w-11 items-center justify-center rounded-full"
      onPress={toggle}
      accessibilityRole="button"
      accessibilityLabel={t(isRevealed ? 'home.balance.hide' : 'home.balance.show')}
      accessibilityHint={isRevealed ? undefined : t('home.balance.showHint')}
    >
      <Icon size={ICON_SIZE.md} color={colors.content.secondary} />
    </PressableSurface>
  );
}
