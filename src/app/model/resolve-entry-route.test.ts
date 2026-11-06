import { ROUTES } from '@/shared/config';

import { resolveEntryRoute } from './resolve-entry-route';

describe('resolveEntryRoute', () => {
  it.each([
    ['none', false, false, ROUTES.welcome],
    ['none', false, true, ROUTES.recover],
    ['pendingBackup', false, false, ROUTES.backup],
    ['pendingPin', false, false, ROUTES.setPin],
    ['active', false, false, ROUTES.lock],
    ['active', true, false, ROUTES.home],
  ] as const)(
    '%s (unlocked: %s, recovery: %s) → %s',
    (status, isUnlocked, isRecoveryRequired, route) => {
      expect(resolveEntryRoute({ status, isUnlocked, isRecoveryRequired })).toBe(route);
    },
  );

  it('never skips onboarding steps because the session is unlocked', () => {
    expect(
      resolveEntryRoute({ status: 'pendingBackup', isUnlocked: true, isRecoveryRequired: false }),
    ).toBe(ROUTES.backup);
  });
});
