import type { ReactNode } from 'react';
import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { MOTION } from './motion';

type CardProps = {
  children: ReactNode;
  /** Position in a list of cards; drives the entering stagger. */
  enterIndex?: number;
  className?: string;
};

export function Card({ children, enterIndex = 0, className = '' }: CardProps) {
  return (
    <Animated.View
      entering={FadeInDown.delay(enterIndex * MOTION.staggerMs).duration(MOTION.baseMs)}
    >
      <View className={`rounded-card border border-border bg-surface-card p-5 ${className}`}>
        {children}
      </View>
    </Animated.View>
  );
}
