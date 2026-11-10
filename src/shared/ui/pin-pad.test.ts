import { pinKeySize } from './pin-pad';

describe('pinKeySize', () => {
  it('scales with the width between 72 and 88 dp', () => {
    expect(pinKeySize(393, 852)).toBe(88);
    expect(pinKeySize(430, 932)).toBe(88);
    expect(pinKeySize(320, 900)).toBe(74);
  });

  it('shrinks on short screens (iPhone SE) but never below 72 dp', () => {
    expect(pinKeySize(375, 667)).toBe(73);
    expect(pinKeySize(360, 640)).toBe(72);
  });
});
