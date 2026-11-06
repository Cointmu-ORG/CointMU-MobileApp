import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { AUTO_LOCK_DEFAULT_MS, useSessionStore } from '@/entities/auth';

/**
 * D-16: lock after the app was in the background for at least `timeoutMs`.
 * A negative elapsed time (clock set backwards) also locks, rather than skipping the check.
 */
export function useAutoLock(timeoutMs: number = AUTO_LOCK_DEFAULT_MS): void {
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
