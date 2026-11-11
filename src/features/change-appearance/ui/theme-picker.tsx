import Check from 'lucide-react-native/icons/check';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useAppearanceStore } from '@/shared/model';
import {
  buildThemeColors,
  ICON_SIZE,
  PressableSurface,
  Text,
  THEME_PREFERENCES,
  useThemeColors,
  type AccentId,
  type ColorScheme,
  type SurfacePalette,
  type ThemePreference,
} from '@/shared/ui';

const TILE_PALETTE = {
  selected: {
    idle: 'border-2 border-accent bg-primary-50',
    hovered: 'border-2 border-accent bg-primary-50',
    pressed: 'border-2 border-accent bg-primary-100',
  },
  unselected: {
    idle: 'border-2 border-border bg-surface-card',
    hovered: 'border-2 border-border bg-surface',
    pressed: 'border-2 border-border bg-surface-muted',
  },
} as const satisfies Record<string, SurfacePalette>;

/**
 * A small picture of the home screen in one scheme: header line, balance card, a button in the
 * accent. Painted with that scheme's real tokens, so it shows what the choice looks like
 * whatever theme is active now.
 */
function MiniScreen({ scheme, accent }: { scheme: ColorScheme; accent: AccentId }) {
  const colors = buildThemeColors(scheme, accent);
  return (
    <View style={[styles.screen, { backgroundColor: colors.surface.DEFAULT }]}>
      <View style={[styles.line, styles.short, { backgroundColor: colors.content.secondary }]} />
      <View
        style={[
          styles.card,
          { backgroundColor: colors.surface.card, borderColor: colors.border.DEFAULT },
        ]}
      >
        <View style={[styles.line, { backgroundColor: colors.content.DEFAULT }]} />
        <View style={[styles.line, styles.short, { backgroundColor: colors.content.muted }]} />
      </View>
      <View style={[styles.button, { backgroundColor: colors.primary[600] }]} />
    </View>
  );
}

function Preview({ preference, accent }: { preference: ThemePreference; accent: AccentId }) {
  if (preference !== 'system') {
    return (
      <View style={styles.preview}>
        <MiniScreen scheme={preference} accent={accent} />
      </View>
    );
  }
  // "System" is both: light on the left, dark on the right.
  return (
    <View style={styles.preview}>
      <MiniScreen scheme="light" accent={accent} />
      <MiniScreen scheme="dark" accent={accent} />
    </View>
  );
}

/** Light, dark, or whatever the phone uses. Applies the moment it is tapped. */
export function ThemePicker() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const theme = useAppearanceStore((state) => state.theme);
  const accent = useAppearanceStore((state) => state.accent);

  return (
    <View
      className="flex-row gap-3"
      accessibilityRole="radiogroup"
      accessibilityLabel={t('settings.appearance.theme')}
    >
      {THEME_PREFERENCES.map((preference) => {
        const isSelected = preference === theme;
        const label = t(`settings.appearance.themes.${preference}`);
        return (
          <PressableSurface
            key={preference}
            containerClassName="flex-1"
            className="gap-2 rounded-card p-2"
            palette={isSelected ? TILE_PALETTE.selected : TILE_PALETTE.unselected}
            onPress={() => useAppearanceStore.getState().update({ theme: preference })}
            accessibilityRole="radio"
            accessibilityLabel={label}
            accessibilityState={{ selected: isSelected, checked: isSelected }}
          >
            <Preview preference={preference} accent={accent} />
            <View className="min-h-6 flex-row items-center justify-center gap-1">
              {isSelected ? <Check size={ICON_SIZE.sm} color={colors.accent.DEFAULT} /> : null}
              <Text variant="label" tone={isSelected ? 'primary' : 'default'} numberOfLines={1}>
                {label}
              </Text>
            </View>
          </PressableSurface>
        );
      })}
    </View>
  );
}

const PREVIEW_HEIGHT = 96;
const PREVIEW_RADIUS = 10;
const LINE_HEIGHT = 4;

const styles = StyleSheet.create({
  preview: {
    height: PREVIEW_HEIGHT,
    flexDirection: 'row',
    overflow: 'hidden',
    borderRadius: PREVIEW_RADIUS,
  },
  screen: { flex: 1, padding: 8, gap: 6, justifyContent: 'space-between' },
  card: { borderWidth: 1, borderRadius: 6, padding: 6, gap: 4 },
  line: { height: LINE_HEIGHT, borderRadius: LINE_HEIGHT / 2, width: '80%' },
  short: { width: '45%' },
  button: { height: 12, borderRadius: 6 },
});
