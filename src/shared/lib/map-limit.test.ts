import { mapWithLimit } from './map-limit';

describe('mapWithLimit', () => {
  it('keeps input order and never exceeds the limit', async () => {
    let inFlight = 0;
    let peak = 0;
    const result = await mapWithLimit([5, 1, 4, 2, 3], 2, async (value) => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await new Promise((resolve) => setTimeout(resolve, value));
      inFlight -= 1;
      return value * 10;
    });
    expect(result).toEqual([50, 10, 40, 20, 30]);
    expect(peak).toBe(2);
  });

  it('returns an empty list for no items', async () => {
    await expect(mapWithLimit([], 3, async (value: number) => value)).resolves.toEqual([]);
  });

  it('rejects when one call fails', async () => {
    await expect(
      mapWithLimit([1, 2], 2, async (value) => {
        if (value === 2) throw new Error('boom');
        return value;
      }),
    ).rejects.toThrow('boom');
  });
});
