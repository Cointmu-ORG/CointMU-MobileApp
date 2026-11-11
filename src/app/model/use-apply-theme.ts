import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { Appearance } from 'react-native';

import { logger } from '@/shared/lib';
import { useAppearanceStore } from '@/shared/model';
import type { Theme } from '@/shared/ui';

/**
 * Carries the theme to the parts of the screen React does not draw. The native color scheme
 * follows the user's choice ("System" removes the override), so alerts, the keyboard, switches
 * and the share sheet match; the window background takes the surface color, so nothing white
 * shows behind a screen transition or the keyboard in the dark theme.
 */
export function useApplyTheme(theme: Theme): void {
  const preference = useAppearanceStore((state) => state.theme);
  const background = theme.colors.surface.DEFAULT;

  useEffect(() => {
    Appearance.setColorScheme(preference === 'system' ? 'unspecified' : preference);
  }, [preference]);

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(background).catch((error: unknown) =>
      logger.warn('Setting the window background failed', { error }),
    );
  }, [background]);
}
