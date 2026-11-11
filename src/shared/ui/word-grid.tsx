import { View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { MOTION } from './motion';
import { Text } from './text';

/** Same for every word, so a masked grid tells nothing about word lengths. */
const MASKED_WORD = '•••••';

function WordChip({ index, word }: { index: number; word: string }) {
  return (
    <View className="w-1/2 p-1">
      <Animated.View entering={FadeIn.delay(index * MOTION.staggerMs).duration(MOTION.baseMs)}>
        <View className="min-h-12 flex-row items-center gap-2 rounded-control border border-border bg-surface-card px-3 py-3">
          <Text variant="caption" tone="secondary" className="w-5 text-right">
            {index + 1}
          </Text>
          <Text variant="body" className="font-medium">
            {word}
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}

type WordGridProps = {
  words: readonly string[];
  /** Renders dots in place of every word; the words are not in the tree at all. */
  isMasked?: boolean;
};

/** Numbered two-column grid for recovery phrase words. Callers block screenshots. */
export function WordGrid({ words, isMasked = false }: WordGridProps) {
  return (
    <View className="flex-row flex-wrap">
      {words.map((word, index) => (
        // Words can repeat in a phrase; the position makes the key unique and stable.
        <WordChip key={`${index}-${word}`} index={index} word={isMasked ? MASKED_WORD : word} />
      ))}
    </View>
  );
}
