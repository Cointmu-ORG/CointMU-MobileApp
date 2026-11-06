import {
  pinHasher,
  registerSuccess,
  useSessionStore,
  writeLockoutState,
  writePinRecord,
} from '@/entities/auth';
import { useWalletStore } from '@/entities/wallet';

/** Stores the salted PIN record (never the PIN) and starts with a clean lockout state. */
export async function savePin(pin: string): Promise<void> {
  await writePinRecord(await pinHasher.hash(pin));
  await writeLockoutState(registerSuccess(Date.now()));
}

/** Unlock first so the router goes straight to the app, not the lock screen. */
export function finishOnboarding(): void {
  useSessionStore.getState().unlock();
  useWalletStore.getState().activate();
}
