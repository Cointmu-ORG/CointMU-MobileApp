import { useSessionStore } from '@/entities/auth';

/** "Lock now": the guard swaps the app for the lock screen; nothing is deleted. */
export function lockNow(): void {
  useSessionStore.getState().lock();
}
