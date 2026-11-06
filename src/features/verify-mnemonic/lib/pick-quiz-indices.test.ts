import { secureRandomInt } from '@/shared/lib';

import { pickQuizIndices } from './pick-quiz-indices';

describe('pickQuizIndices', () => {
  it('returns distinct, sorted, in-range positions', () => {
    for (let run = 0; run < 200; run += 1) {
      const picked = pickQuizIndices(12, 3, secureRandomInt);
      expect(new Set(picked).size).toBe(3);
      expect(picked).toEqual([...picked].sort((a, b) => a - b));
      expect(picked.every((index) => index >= 0 && index < 12)).toBe(true);
    }
  });

  it('is deterministic with an injected generator', () => {
    expect(pickQuizIndices(12, 3, () => 0)).toEqual([0, 1, 2]);
    // Always swapping with the last slot: [11, 0, 1] before sorting.
    expect(pickQuizIndices(12, 3, (max) => max - 1)).toEqual([0, 1, 11]);
  });

  it('can reach every position', () => {
    const seen = new Set<number>();
    for (let run = 0; run < 500; run += 1) {
      pickQuizIndices(12, 3, secureRandomInt).forEach((index) => seen.add(index));
    }
    expect(seen.size).toBe(12);
  });

  it('rejects asking for more words than exist', () => {
    expect(() => pickQuizIndices(2, 3, secureRandomInt)).toThrow(RangeError);
  });
});
