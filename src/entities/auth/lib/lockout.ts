import { LOCKOUT_POLICY } from '../config/auth-config';

/** Persisted in SecureStore, not in a persisted store (D-27). Times are epoch ms. */
export type LockoutState = {
  readonly failedCount: number;
  readonly lockoutUntil: number | null;
  /** Latest clock reading seen; detects the device clock being set backwards. */
  readonly lastSeenAt: number;
};

export const INITIAL_LOCKOUT: LockoutState = { failedCount: 0, lockoutUntil: null, lastSeenAt: 0 };

/** Wait after the given number of consecutive failures; 0 while still in the free attempts. */
export function lockoutDurationMs(failedCount: number): number {
  const step = failedCount - LOCKOUT_POLICY.freeAttempts - 1;
  if (step < 0) return 0;
  const steps = LOCKOUT_POLICY.stepsMs;
  return steps[Math.min(step, steps.length - 1)] ?? 0;
}

export function registerFailure(state: LockoutState, now: number): LockoutState {
  const failedCount = state.failedCount + 1;
  const duration = lockoutDurationMs(failedCount);
  return { failedCount, lockoutUntil: duration > 0 ? now + duration : null, lastSeenAt: now };
}

export function registerSuccess(now: number): LockoutState {
  return { ...INITIAL_LOCKOUT, lastSeenAt: now };
}

/**
 * Call before reading the lockout. If the clock went backwards while a lockout was running,
 * restart that lockout from now instead of treating it as expired.
 * ponytail: moving the clock forward still ends a lockout early; only a server clock fixes that.
 */
export function reconcileClock(state: LockoutState, now: number): LockoutState {
  if (now >= state.lastSeenAt) return { ...state, lastSeenAt: now };
  const wasLocked = state.lockoutUntil !== null && state.lockoutUntil > state.lastSeenAt;
  return {
    ...state,
    lastSeenAt: now,
    lockoutUntil: wasLocked ? now + lockoutDurationMs(state.failedCount) : null,
  };
}

export function remainingLockoutMs(state: LockoutState, now: number): number {
  return state.lockoutUntil === null ? 0 : Math.max(0, state.lockoutUntil - now);
}

export function shouldOfferReset(state: LockoutState): boolean {
  return state.failedCount >= LOCKOUT_POLICY.resetOfferAfterFailures;
}
