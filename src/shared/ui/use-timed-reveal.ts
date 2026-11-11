import { useCallback, useEffect, useState } from 'react';

import { REVEAL_DURATION_MS } from '../model/privacy-store';

/**
 * Masked by default. `toggle` reveals and masks; a revealed secret masks itself again after
 * `REVEAL_DURATION_MS`. The state dies with the component, so remounting starts masked.
 */
export function useTimedReveal(): { isRevealed: boolean; toggle: () => void } {
  const [isRevealed, setIsRevealed] = useState(false);
  useEffect(() => {
    if (!isRevealed) return;
    const timer = setTimeout(() => setIsRevealed(false), REVEAL_DURATION_MS);
    return () => clearTimeout(timer);
  }, [isRevealed]);
  const toggle = useCallback(() => setIsRevealed((current) => !current), []);
  return { isRevealed, toggle };
}
