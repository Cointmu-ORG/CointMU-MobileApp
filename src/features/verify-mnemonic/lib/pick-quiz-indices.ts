import type { RandomInt } from '@/shared/lib';

/**
 * Picks `count` distinct word positions in [0, wordCount), sorted ascending so the quiz asks in
 * phrase order. Partial Fisher-Yates over the positions; `randomInt` is injected for tests.
 */
export function pickQuizIndices(wordCount: number, count: number, randomInt: RandomInt): number[] {
  if (count > wordCount) {
    throw new RangeError(`Cannot pick ${count} quiz words from ${wordCount}`);
  }
  const positions = Array.from({ length: wordCount }, (_, index) => index);
  for (let i = 0; i < count; i += 1) {
    const j = i + randomInt(wordCount - i);
    [positions[i], positions[j]] = [positions[j] as number, positions[i] as number];
  }
  return positions.slice(0, count).sort((a, b) => a - b);
}
