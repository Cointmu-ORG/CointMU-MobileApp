import { buildThemeColors, DEFAULT_ACCENT, DEFAULT_SCHEME, resolveScheme } from './build-theme';

/**
 * The light palette with the default accent: what a component gets outside a ThemeRoot (unit
 * tests) and what the native splash is painted with. Runtime code reads `useThemeColors()`.
 */
export const defaultColors = buildThemeColors(DEFAULT_SCHEME, DEFAULT_ACCENT);

/**
 * Background of the native splash for the device's color scheme (app.json: the splash plugin's
 * `backgroundColor` and `dark.backgroundColor`). The JS hand-off paints the same color.
 */
export function splashBackground(deviceScheme: string | null | undefined): string {
  return buildThemeColors(resolveScheme('system', deviceScheme), DEFAULT_ACCENT).surface.DEFAULT;
}
