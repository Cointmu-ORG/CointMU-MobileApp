import { colors } from '@/shared/ui';

/** Native header for sub-screens: back button in the brand color, no title or shadow. */
export const SUB_SCREEN_HEADER = {
  headerShown: true,
  headerTitle: '',
  headerShadowVisible: false,
  headerTintColor: colors.primary[600],
  headerStyle: { backgroundColor: colors.surface.DEFAULT },
} as const;
