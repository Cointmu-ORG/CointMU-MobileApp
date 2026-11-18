import ChevronDown from 'lucide-react-native/icons/chevron-down';
import { useState, type ReactNode } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { MOTION } from './motion';
import { PressableSurface, SURFACE_PALETTE } from './pressable-surface';
import { Text } from './text';
import { ICON_SIZE } from './theme/icon-size';
import { useThemeColors } from './theme/theme-root';

type DisclosureProps = {
  title: string;
  children: ReactNode;
};

/**
 * A section that is collapsed until its title is tapped, for details most people never need.
 * The content is not rendered while collapsed, so a screen reader skips it too.
 */
export function Disclosure({ title, children }: DisclosureProps) {
  const colors = useThemeColors();
  const [isOpen, setIsOpen] = useState(false);
  return (
    <View className="gap-2">
      <PressableSurface
        palette={SURFACE_PALETTE.ghost}
        className="min-h-11 flex-row items-center justify-between rounded-control px-2"
        onPress={() => setIsOpen((open) => !open)}
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ expanded: isOpen }}
      >
        <Text variant="label" tone="secondary">
          {title}
        </Text>
        <View style={{ transform: [{ rotate: isOpen ? '180deg' : '0deg' }] }}>
          <ChevronDown size={ICON_SIZE.md} color={colors.content.secondary} />
        </View>
      </PressableSurface>
      {isOpen ? (
        <Animated.View entering={FadeIn.duration(MOTION.fastMs)}>{children}</Animated.View>
      ) : null}
    </View>
  );
}
