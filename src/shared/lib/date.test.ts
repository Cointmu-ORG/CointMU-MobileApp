import { dateLocale, formatDateTime } from './date';

// 2026-11-07 07:05 UTC; the test asserts parts that do not depend on the machine's time zone.
const WHEN = Date.UTC(2026, 10, 7, 7, 5);

describe('formatDateTime', () => {
  it('uses Indonesian month names for id', () => {
    expect(formatDateTime(WHEN, 'id')).toMatch(/Nov 2026/);
    expect(dateLocale('id-ID').code).toBe('id');
  });

  it('uses English for en and for unknown languages', () => {
    expect(formatDateTime(WHEN, 'en')).toMatch(/Nov \d+, 2026/);
    expect(dateLocale('xx').code).toBe('en-US');
  });
});
