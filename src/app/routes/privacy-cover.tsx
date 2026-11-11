import { StyleSheet, View } from 'react-native';

import { BrandMark, useThemeColors } from '@/shared/ui';

import { usePrivacyGuard } from '../model/use-privacy-guard';

const LOGO_SIZE = 72;

/**
 * Opaque cover with the logo, drawn over everything while Muvo is not the active app and
 * "Hide Muvo in the app switcher" is on. Rendered last in the root layout, so it is on top of
 * every screen and sheet.
 */
export function PrivacyCover() {
  const isCovered = usePrivacyGuard();
  const colors = useThemeColors();
  if (!isCovered) return null;
  return (
    <View
      testID="privacy-cover"
      style={[styles.cover, { backgroundColor: colors.surface.DEFAULT }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <BrandMark size={LOGO_SIZE} />
    </View>
  );
}

const styles = StyleSheet.create({
  cover: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
});
