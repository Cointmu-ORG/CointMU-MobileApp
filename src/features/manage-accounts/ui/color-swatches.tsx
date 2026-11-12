import Check from 'lucide-react-native/icons/check';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import {
  CARD_COLOR_IDS,
  ICON_SIZE,
  PressableSurface,
  SURFACE_PALETTE,
  Text,
  useCardFill,
  useThemeColors,
  type CardColorId,
} from '@/shared/ui';

type ColorSwatchesProps = {
  label: string;
  value: CardColorId;
  onChange: (color: CardColorId) => void;
};

/** The card palette as a radio group. The selected swatch carries a check, not color alone. */
export function ColorSwatches({ label, value, onChange }: ColorSwatchesProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const fillOf = useCardFill();

  return (
    <View className="gap-2">
      <Text variant="label" tone="secondary">
        {label}
      </Text>
      <View
        className="flex-row flex-wrap gap-1"
        accessibilityRole="radiogroup"
        accessibilityLabel={label}
      >
        {CARD_COLOR_IDS.map((id) => {
          const isSelected = id === value;
          return (
            <PressableSurface
              key={id}
              palette={SURFACE_PALETTE.ghost}
              className="h-12 w-12 items-center justify-center rounded-full"
              onPress={() => onChange(id)}
              accessibilityRole="radio"
              accessibilityLabel={t(`wallets.colors.${id}`)}
              accessibilityState={{ selected: isSelected, checked: isSelected }}
            >
              <View
                style={[
                  styles.swatch,
                  { backgroundColor: fillOf(id) },
                  isSelected ? { borderColor: colors.content.DEFAULT } : styles.unselected,
                ]}
              >
                {isSelected ? <Check size={ICON_SIZE.md} color={colors.content.inverse} /> : null}
              </View>
            </PressableSurface>
          );
        })}
      </View>
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
