import { LOCKOUT_POLICY } from '../config/auth-config';
import {
  INITIAL_LOCKOUT,
  reconcileClock,
  registerFailure,
  registerSuccess,
  remainingLockoutMs,
  shouldOfferReset,
  type LockoutState,
} from './lockout';

const NOW = 1_700_000_000_000;
const [FIRST_STEP_MS, SECOND_STEP_MS] = LOCKOUT_POLICY.stepsMs;
const LAST_STEP_MS = LOCKOUT_POLICY.stepsMs[LOCKOUT_POLICY.stepsMs.length - 1];

function failTimes(count: number, now = NOW): LockoutState {
  let state = INITIAL_LOCKOUT;
  for (let i = 0; i < count; i += 1) state = registerFailure(state, now);
  return state;
}

describe('lockout escalation', () => {
  it('allows the free attempts without a lockout', () => {
    expect(remainingLockoutMs(failTimes(LOCKOUT_POLICY.freeAttempts), NOW)).toBe(0);
  });

  it('locks after the free attempts and escalates', () => {
    const fifth = failTimes(LOCKOUT_POLICY.freeAttempts + 1);
    expect(remainingLockoutMs(fifth, NOW)).toBe(FIRST_STEP_MS);
    expect(remainingLockoutMs(registerFailure(fifth, NOW), NOW)).toBe(SECOND_STEP_MS);
  });

  it('caps at the last step', () => {
    expect(remainingLockoutMs(failTimes(50), NOW)).toBe(LAST_STEP_MS);
  });

  it('expires once the time passes', () => {
    const state = failTimes(LOCKOUT_POLICY.freeAttempts + 1);
    expect(remainingLockoutMs(state, NOW + (FIRST_STEP_MS ?? 0))).toBe(0);
  });

  it('offers reset only after the configured failures', () => {
    expect(shouldOfferReset(failTimes(LOCKOUT_POLICY.resetOfferAfterFailures - 1))).toBe(false);
    expect(shouldOfferReset(failTimes(LOCKOUT_POLICY.resetOfferAfterFailures))).toBe(true);
  });

  it('resets on success', () => {
    expect(registerSuccess(NOW)).toEqual({ failedCount: 0, lockoutUntil: null, lastSeenAt: NOW });
  });
});

describe('reconcileClock', () => {
  it('restarts a running lockout when the clock goes backwards', () => {
    const locked = failTimes(LOCKOUT_POLICY.freeAttempts + 1);
    const rolledBack = NOW - 24 * 60 * 60 * 1000;
    const reconciled = reconcileClock(locked, rolledBack);
    expect(remainingLockoutMs(reconciled, rolledBack)).toBe(FIRST_STEP_MS);
    expect(reconciled.lastSeenAt).toBe(rolledBack);
  });

  it('does not resurrect an expired lockout after a rollback', () => {
    const locked = failTimes(LOCKOUT_POLICY.freeAttempts + 1);
    const later = NOW + (FIRST_STEP_MS ?? 0) + 1;
    const seenExpired = reconcileClock(locked, later);
    const reconciled = reconcileClock(seenExpired, NOW);
    expect(remainingLockoutMs(reconciled, NOW)).toBe(0);
  });

  it('only advances lastSeenAt when time moves forward', () => {
    const locked = failTimes(LOCKOUT_POLICY.freeAttempts + 1);
    expect(reconcileClock(locked, NOW + 5)).toEqual({ ...locked, lastSeenAt: NOW + 5 });
  });
});
