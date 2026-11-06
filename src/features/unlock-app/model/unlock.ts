import {
  authenticateWithBiometrics,
  pinHasher,
  readLockoutState,
  readPinRecord,
  reconcileClock,
  registerFailure,
  registerSuccess,
  remainingLockoutMs,
  useSessionStore,
  writeLockoutState,
  writePinRecord,
  type LockoutState,
  type PinRecord,
} from '@/entities/auth';
import { logger } from '@/shared/lib';

export type UnlockAttempt =
  | { readonly status: 'verified' }
  | { readonly status: 'wrong-pin' | 'locked-out'; readonly lockout: LockoutState };

/** Reads the lockout, applies the clock-rollback guard and persists lastSeenAt. */
export async function loadLockout(now = Date.now()): Promise<LockoutState> {
  const state = reconcileClock(await readLockoutState(), now);
  await writeLockoutState(state);
  return state;
}

async function rehashIfOutdated(pin: string, record: PinRecord): Promise<void> {
  if (!pinHasher.needsRehash(record)) return;
  try {
    await writePinRecord(await pinHasher.hash(pin));
  } catch (error) {
    // The old record still verifies, so unlocking must not fail because of this.
    logger.warn('PIN record rehash failed', { error });
  }
}

/**
 * Checks a PIN against the stored record, using the record's own KDF params, and updates the
 * lockout. On success, records made with outdated params are rehashed with the current config.
 * Does not unlock the session: the caller calls completeUnlock() after its success animation.
 */
export async function attemptPinUnlock(pin: string, now = Date.now()): Promise<UnlockAttempt> {
  const lockout = await loadLockout(now);
  if (remainingLockoutMs(lockout, now) > 0) return { status: 'locked-out', lockout };

  const record = await readPinRecord();
  const isValid = record !== null && (await pinHasher.verify(pin, record));
  if (!isValid) {
    const next = registerFailure(lockout, now);
    await writeLockoutState(next);
    return { status: next.lockoutUntil === null ? 'wrong-pin' : 'locked-out', lockout: next };
  }

  await writeLockoutState(registerSuccess(now));
  await rehashIfOutdated(pin, record);
  return { status: 'verified' };
}

/** Biometrics are not offered while a PIN lockout runs. Success also clears the failure count. */
export async function attemptBiometricUnlock(prompt: string, now = Date.now()): Promise<boolean> {
  const lockout = await loadLockout(now);
  if (remainingLockoutMs(lockout, now) > 0) return false;
  if (!(await authenticateWithBiometrics(prompt))) return false;
  await writeLockoutState(registerSuccess(now));
  return true;
}

export function completeUnlock(): void {
  useSessionStore.getState().unlock();
}
