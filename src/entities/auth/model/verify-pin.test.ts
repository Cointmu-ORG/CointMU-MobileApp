import {
  readLockoutState,
  readPinRecord,
  writeLockoutState,
  writePinRecord,
} from '../api/auth-storage';
import { PIN_KDF } from '../config/auth-config';
import { createPbkdf2PinHasher } from '../lib/pin-hasher';
import { attemptPin, loadLockout } from './verify-pin';

const PIN = '135790';
const NOW = 1_700_000_000_000;
const OUTDATED_ITERATIONS = 10;

async function storePin(iterations: number = PIN_KDF.iterations) {
  await writePinRecord(await createPbkdf2PinHasher({ ...PIN_KDF, iterations }).hash(PIN));
}

describe('attemptPin', () => {
  it('verifies the right PIN and clears failures', async () => {
    await storePin();
    await attemptPin('000000', NOW);
    await expect(attemptPin(PIN, NOW)).resolves.toEqual({ status: 'verified' });
    expect((await readLockoutState()).failedCount).toBe(0);
  });

  it('counts wrong PINs and locks out after the free attempts', async () => {
    await storePin();
    const results = [];
    for (let i = 0; i < 5; i += 1) results.push(await attemptPin('000000', NOW));
    expect(results.slice(0, 4).map((r) => r.status)).toEqual(Array(4).fill('wrong-pin'));
    expect(results[4]?.status).toBe('locked-out');
    // Even the right PIN is refused while locked out.
    await expect(attemptPin(PIN, NOW)).resolves.toMatchObject({ status: 'locked-out' });
  });

  it('rehashes a record made with outdated KDF params after a successful unlock', async () => {
    await storePin(OUTDATED_ITERATIONS);
    await expect(attemptPin(PIN, NOW)).resolves.toEqual({ status: 'verified' });
    const record = await readPinRecord();
    expect(record).toMatchObject({ v: PIN_KDF.version, iterations: PIN_KDF.iterations });
    await expect(attemptPin(PIN, NOW)).resolves.toEqual({ status: 'verified' });
  });

  it('migrates a v1 record (20,000 iterations) to the current version (D-41)', async () => {
    const v1 = createPbkdf2PinHasher({ ...PIN_KDF, version: 1, iterations: 20_000 });
    await writePinRecord(await v1.hash(PIN));
    await expect(attemptPin(PIN, NOW)).resolves.toEqual({ status: 'verified' });
    await expect(readPinRecord()).resolves.toMatchObject({
      v: PIN_KDF.version,
      iterations: PIN_KDF.iterations,
    });
  });

  it('keeps an outdated record when the PIN is wrong', async () => {
    await storePin(OUTDATED_ITERATIONS);
    await attemptPin('000000', NOW);
    expect((await readPinRecord())?.iterations).toBe(OUTDATED_ITERATIONS);
  });
});

describe('loadLockout', () => {
  it('persists the clock-rollback restart', async () => {
    await writeLockoutState({ failedCount: 5, lockoutUntil: NOW + 30_000, lastSeenAt: NOW });
    const earlier = NOW - 60_000;
    const state = await loadLockout(earlier);
    expect(state.lockoutUntil).toBe(earlier + 30_000);
    await expect(readLockoutState()).resolves.toEqual(state);
  });
});
