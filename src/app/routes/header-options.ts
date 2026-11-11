import { useMemo } from 'react';

import { useThemeColors } from '@/shared/ui';

/**
 * Native header for every sub-screen: accent-colored back arrow with no label (so a route group
 * name such as "(tabs)" can never show), a centered title in the text color, no shadow. A hook,
 * because the colors follow the theme.
 */
export function useSubScreenHeader() {
  const colors = useThemeColors();
  return useMemo(
    () =>
      ({
        headerShown: true,
        headerTitle: '',
        headerTitleAlign: 'center',
        headerTitleStyle: { color: colors.content.DEFAULT, fontWeight: '600' },
        headerBackButtonDisplayMode: 'minimal',
        headerShadowVisible: false,
        headerTintColor: colors.accent.DEFAULT,
        headerStyle: { backgroundColor: colors.surface.DEFAULT },
      }) as const,
    [colors],
  );
}
