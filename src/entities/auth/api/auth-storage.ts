import { logger, secureStorage } from '@/shared/lib';

import { INITIAL_LOCKOUT, type LockoutState } from '../lib/lockout';
import type { PinRecord } from '../lib/pin-hasher';

const PIN_RECORD_KEY = 'muvo.auth.pin';
const LOCKOUT_KEY = 'muvo.auth.lockout';

function parseJson(raw: string, key: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    logger.warn('SecureStore item is not valid JSON', { key });
    return null;
  }
}

function isPinRecord(value: unknown): value is PinRecord {
  if (typeof value !== 'object' || value === null) return false;
  const r = value as Record<string, unknown>;
  return (
    typeof r.v === 'number' &&
    r.algo === 'pbkdf2-sha256' &&
    typeof r.iterations === 'number' &&
    typeof r.salt === 'string' &&
    typeof r.hash === 'string'
  );
}

function isLockoutState(value: unknown): value is LockoutState {
  if (typeof value !== 'object' || value === null) return false;
  const r = value as Record<string, unknown>;
  return (
    typeof r.failedCount === 'number' &&
    (r.lockoutUntil === null || typeof r.lockoutUntil === 'number') &&
    typeof r.lastSeenAt === 'number'
  );
}

/**
 * Null when missing or unreadable. With no record every PIN attempt fails, which leads to the
 * reset offer. ponytail: no dedicated "corrupt record" screen; add one if it is ever seen.
 */
export async function readPinRecord(): Promise<PinRecord | null> {
  const raw = await secureStorage.get(PIN_RECORD_KEY);
  if (raw === null) return null;
  const parsed = parseJson(raw, PIN_RECORD_KEY);
  return isPinRecord(parsed) ? parsed : null;
}

/** True when a valid PIN record is stored; SecureStore read errors count as unreadable (D-39). */
export async function hasReadablePinRecord(): Promise<boolean> {
  try {
    return (await readPinRecord()) !== null;
  } catch {
    return false;
  }
}

export function writePinRecord(record: PinRecord): Promise<void> {
  return secureStorage.set(PIN_RECORD_KEY, JSON.stringify(record));
}

export async function readLockoutState(): Promise<LockoutState> {
  const raw = await secureStorage.get(LOCKOUT_KEY);
  if (raw === null) return INITIAL_LOCKOUT;
  const parsed = parseJson(raw, LOCKOUT_KEY);
  return isLockoutState(parsed) ? parsed : INITIAL_LOCKOUT;
}

export function writeLockoutState(state: LockoutState): Promise<void> {
  return secureStorage.set(LOCKOUT_KEY, JSON.stringify(state));
}

export async function wipeAuthRecords(): Promise<void> {
  await Promise.all([secureStorage.remove(PIN_RECORD_KEY), secureStorage.remove(LOCKOUT_KEY)]);
}
