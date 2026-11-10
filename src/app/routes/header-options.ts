import { colors } from '@/shared/ui';

/**
 * Native header for every sub-screen: brand-colored back arrow with no label (so a route group
 * name such as "(tabs)" can never show), a centered title in the text color, no shadow.
 */
export const SUB_SCREEN_HEADER = {
  headerShown: true,
  headerTitle: '',
  headerTitleAlign: 'center',
  headerTitleStyle: { color: colors.content.DEFAULT, fontWeight: '600' },
  headerBackButtonDisplayMode: 'minimal',
  headerShadowVisible: false,
  headerTintColor: colors.primary[600],
  headerStyle: { backgroundColor: colors.surface.DEFAULT },
} as const;
