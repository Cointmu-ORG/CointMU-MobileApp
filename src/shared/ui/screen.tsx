import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MOTION } from './motion';

type ScreenProps = {
  children: ReactNode;
  className?: string;
};

/** Full-height screen with safe areas and a short fade/slide-in on mount. */
export function Screen({ children, className = '' }: ScreenProps) {
  return (
    <SafeAreaView className="flex-1 bg-surface">
      <Animated.View entering={FadeInDown.duration(MOTION.baseMs)} style={styles.fill}>
        <View className={`flex-1 px-6 py-4 ${className}`}>{children}</View>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
