const SECOND_MS = 1_000;
const SECONDS_PER_MINUTE = 60;
const PAD = 2;

/** `m:ss` for lockout waits. Rounds up so it never shows 0:00 while still locked. */
export function formatCountdown(remainingMs: number): string {
  const totalSeconds = Math.ceil(remainingMs / SECOND_MS);
  const minutes = Math.floor(totalSeconds / SECONDS_PER_MINUTE);
  const seconds = String(totalSeconds % SECONDS_PER_MINUTE).padStart(PAD, '0');
  return `${minutes}:${seconds}`;
}
