import * as Haptics from 'expo-haptics';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';

import { MOTION } from './motion';
import { colors } from './theme/colors';
import { useShake } from './use-shake';

type PinDotsProps = {
  length: number;
  filledCount: number;
  /** Increment to play the wrong-PIN shake and haptic. */
  errorSignal: number;
};

function PinDot({ isFilled }: { isFilled: boolean }) {
  const fillStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withTiming(isFilled ? 1 : 0, { duration: MOTION.fastMs }) }],
  }));
  return (
    <View className="h-4 w-4 items-center justify-center rounded-full border-2 border-primary-600">
      <Animated.View style={[styles.fill, fillStyle]} />
    </View>
  );
}

export function PinDots({ length, filledCount, errorSignal }: PinDotsProps) {
  const { t } = useTranslation();
  const { style, shake } = useShake();
  const lastSignal = useRef(errorSignal);

  useEffect(() => {
    if (errorSignal === lastSignal.current) return;
    lastSignal.current = errorSignal;
    shake();
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }, [errorSignal, shake]);

  return (
    <Animated.View
      style={style}
      accessible
      accessibilityLabel={t('pinPad.progress', { filled: filledCount, total: length })}
    >
      <View className="flex-row justify-center gap-4">
        {Array.from({ length }, (_, index) => (
          <PinDot key={index} isFilled={index < filledCount} />
        ))}
      </View>
    </Animated.View>
  );
}

const DOT_FILL_SIZE = 16;

const styles = StyleSheet.create({
  fill: {
    width: DOT_FILL_SIZE,
    height: DOT_FILL_SIZE,
    borderRadius: DOT_FILL_SIZE / 2,
    backgroundColor: colors.primary[600],
  },
});
