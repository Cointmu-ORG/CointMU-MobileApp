import { writeLockoutState, writePinRecord } from '../api/auth-storage';
import { registerSuccess } from '../lib/lockout';
import { pinHasher } from '../lib/pin-hasher';

/** Stores a salted PIN record (never the PIN) and starts from a clean lockout state. */
export async function storeNewPin(pin: string): Promise<void> {
  await writePinRecord(await pinHasher.hash(pin));
  await writeLockoutState(registerSuccess(Date.now()));
}
