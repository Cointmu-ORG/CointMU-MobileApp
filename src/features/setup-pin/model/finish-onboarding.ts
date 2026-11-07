import { useSessionStore } from '@/entities/auth';
import { useWalletStore } from '@/entities/wallet';

/** Unlock first so the router goes straight to the app, not the lock screen. */
export function finishOnboarding(): void {
  useSessionStore.getState().unlock();
  useWalletStore.getState().activate();
}
