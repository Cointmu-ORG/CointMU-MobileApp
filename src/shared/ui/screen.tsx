import { HeaderHeightContext } from 'expo-router/react-navigation';
import { useContext, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { MOTION } from './motion';

type ScreenProps = {
  children: ReactNode;
  className?: string;
};

const ALL_EDGES: readonly Edge[] = ['top', 'right', 'bottom', 'left'];
// A native header already covers the top inset.
const BELOW_HEADER_EDGES: readonly Edge[] = ['right', 'bottom', 'left'];

/** Height of the navigator header above this screen; 0 when there is none. */
export function useHeaderOffset(): number {
  return useContext(HeaderHeightContext) ?? 0;
}

/** Full-height screen with safe areas and a short fade/slide-in on mount. */
export function Screen({ children, className = '' }: ScreenProps) {
  const hasHeader = useHeaderOffset() > 0;
  return (
    <SafeAreaView className="flex-1 bg-surface" edges={hasHeader ? BELOW_HEADER_EDGES : ALL_EDGES}>
      <Animated.View entering={FadeInDown.duration(MOTION.baseMs)} style={styles.fill}>
        <View className={`flex-1 px-6 py-4 ${className}`}>{children}</View>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
