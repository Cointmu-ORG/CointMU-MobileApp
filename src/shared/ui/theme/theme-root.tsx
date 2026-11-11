import { vars } from 'nativewind';
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { StyleSheet, useColorScheme, View } from 'react-native';

import { useAppearanceStore } from '../../model/appearance-store';
import {
  buildThemeColors,
  resolveScheme,
  toCssVariables,
  type ColorScheme,
  type ThemeColors,
} from './build-theme';
import { defaultColors } from './colors';

export type Theme = {
  readonly scheme: ColorScheme;
  readonly colors: ThemeColors;
};

// Outside a ThemeRoot (component tests) everything renders in the light default palette.
const ThemeContext = createContext<Theme>({ scheme: 'light', colors: defaultColors });

/** The resolved theme: follows Settings > Appearance and, on "System", the device. */
export function useResolvedTheme(): Theme {
  const preference = useAppearanceStore((state) => state.theme);
  const accent = useAppearanceStore((state) => state.accent);
  const systemScheme = useColorScheme();
  const scheme = resolveScheme(preference, systemScheme);
  return useMemo(() => ({ scheme, colors: buildThemeColors(scheme, accent) }), [scheme, accent]);
}

/**
 * The one view that carries the color variables. It has them from its first render and only
 * their values change afterwards, so css-interop never has to upgrade a view (D-63). Everything
 * the app renders, native stack screens and sheets included, is a React child of this view and
 * reads the variables through css-interop's context.
 */
export function ThemeRoot({ theme, children }: { theme: Theme; children: ReactNode }) {
  const variables = useMemo(() => vars(toCssVariables(theme.colors)), [theme.colors]);
  return (
    <ThemeContext.Provider value={theme}>
      <View style={[styles.fill, variables]}>{children}</View>
    </ThemeContext.Provider>
  );
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}

/**
 * Token values for props that cannot take a className (icon color, spinner color,
 * placeholderTextColor, navigation options). Same tokens as the classes, for the active theme.
 */
export function useThemeColors(): ThemeColors {
  return useContext(ThemeContext).colors;
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
