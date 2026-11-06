import { useCallback, useRef, useState } from 'react';

/**
 * Digit buffer for a PinPad. Calls onComplete once the PIN reaches `length` digits; the caller
 * decides when to clear(). The PIN lives only in this component, never in a store.
 */
export function usePinInput(length: number, onComplete: (pin: string) => void) {
  // A ref, not a state updater: updaters must stay pure (StrictMode runs them twice).
  const pin = useRef('');
  const [filledCount, setFilledCount] = useState(0);

  const addDigit = useCallback(
    (digit: string) => {
      if (pin.current.length >= length) return;
      pin.current += digit;
      setFilledCount(pin.current.length);
      if (pin.current.length === length) onComplete(pin.current);
    },
    [length, onComplete],
  );

  const removeDigit = useCallback(() => {
    pin.current = pin.current.slice(0, -1);
    setFilledCount(pin.current.length);
  }, []);

  const clear = useCallback(() => {
    pin.current = '';
    setFilledCount(0);
  }, []);

  return { filledCount, addDigit, removeDigit, clear };
}
