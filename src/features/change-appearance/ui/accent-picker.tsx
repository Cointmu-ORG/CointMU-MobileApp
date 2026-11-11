import Check from 'lucide-react-native/icons/check';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useAppearanceStore } from '@/shared/model';
import {
  ACCENT_IDS,
  buildThemeColors,
  ICON_SIZE,
  PressableSurface,
  SURFACE_PALETTE,
  Text,
  useTheme,
} from '@/shared/ui';

/**
 * The desktop's six accents. Each swatch is the fill a primary button gets with that accent, so
 * the check mark on it is the same white-on-fill pair the contrast test covers.
 */
export function AccentPicker() {
  const { t } = useTranslation();
  const { scheme, colors } = useTheme();
  const accent = useAppearanceStore((state) => state.accent);

  return (
    <View className="gap-3 bg-surface-card px-4 py-3">
      <View className="gap-0.5">
        <Text variant="label">{t('settings.appearance.accent')}</Text>
        <Text variant="caption" tone="secondary">
          {t('settings.appearance.accentDesc')}
        </Text>
      </View>
      <View
        className="flex-row flex-wrap gap-2"
        accessibilityRole="radiogroup"
        accessibilityLabel={t('settings.appearance.accent')}
      >
        {ACCENT_IDS.map((id) => {
          const isSelected = id === accent;
          const fill = buildThemeColors(scheme, id).primary[600];
          return (
            <PressableSurface
              key={id}
              palette={SURFACE_PALETTE.ghost}
              className="h-12 w-12 items-center justify-center rounded-full"
              onPress={() => useAppearanceStore.getState().update({ accent: id })}
              accessibilityRole="radio"
              accessibilityLabel={t(`settings.appearance.accents.${id}`)}
              accessibilityState={{ selected: isSelected, checked: isSelected }}
            >
              <View
                style={[
                  styles.swatch,
                  { backgroundColor: fill },
                  isSelected ? { borderColor: colors.content.DEFAULT } : styles.unselected,
                ]}
              >
                {isSelected ? <Check size={ICON_SIZE.md} color={colors.content.inverse} /> : null}
              </View>
            </PressableSurface>
          );
        })}
      </View>
      <Text variant="caption" tone="secondary">
        {t('settings.appearance.accentCurrent', {
          name: t(`settings.appearance.accents.${accent}`),
        })}
      </Text>
    </View>
  );
}

const SWATCH_SIZE = 36;
const SELECTED_BORDER = 3;

const styles = StyleSheet.create({
  swatch: {
    width: SWATCH_SIZE,
    height: SWATCH_SIZE,
    borderRadius: SWATCH_SIZE / 2,
    borderWidth: SELECTED_BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unselected: { borderColor: 'transparent' },
});
