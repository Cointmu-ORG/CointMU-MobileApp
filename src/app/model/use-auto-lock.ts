import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { useAuthPrefsStore, useSessionStore } from '@/entities/auth';

/**
 * D-16: lock after the app was in the background for at least the user's auto-lock timeout
 * (0 = immediately). A negative elapsed time (clock set backwards) also locks.
 */
export function useAutoLock(): void {
  const timeoutMs = useAuthPrefsStore((state) => state.autoLockMs);
  const backgroundedAt = useRef<number | null>(null);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'background') {
        backgroundedAt.current = Date.now();
        return;
      }
      if (next !== 'active' || backgroundedAt.current === null) return;
      const elapsed = Date.now() - backgroundedAt.current;
      backgroundedAt.current = null;
      if (elapsed < 0 || elapsed >= timeoutMs) useSessionStore.getState().lock();
    });
    return () => subscription.remove();
  }, [timeoutMs]);
}
