import { useEffect, useState } from 'react';

import type { LockoutState } from '../lib/lockout';

const TICK_MS = 1_000;

/**
 * Milliseconds left in the lockout, ticking once a second; 0 when not locked.
 * Starts from the lockout's own `lastSeenAt` (the time it was computed), so a new lockout
 * shows the right value before the first tick.
 */
export function useLockoutCountdown(lockout: LockoutState | null): number {
  const [now, setNow] = useState(0);
  const until = lockout?.lockoutUntil ?? null;

  useEffect(() => {
    if (until === null) return;
    const timer = setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= until) clearInterval(timer);
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [until]);

  if (until === null || lockout === null) return 0;
  return Math.max(0, until - Math.max(now, lockout.lastSeenAt));
}
