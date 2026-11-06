import { ROUTES } from '@/shared/config';

import { resolveEntryRoute } from './resolve-entry-route';

describe('resolveEntryRoute', () => {
  it.each([
    ['none', false, ROUTES.welcome],
    ['pendingBackup', false, ROUTES.backup],
    ['pendingPin', false, ROUTES.setPin],
    ['active', false, ROUTES.lock],
    ['active', true, ROUTES.home],
  ] as const)('%s (unlocked: %s) → %s', (status, isUnlocked, route) => {
    expect(resolveEntryRoute(status, isUnlocked)).toBe(route);
  });

  it('never skips onboarding steps because the session is unlocked', () => {
    expect(resolveEntryRoute('pendingBackup', true)).toBe(ROUTES.backup);
  });
});
