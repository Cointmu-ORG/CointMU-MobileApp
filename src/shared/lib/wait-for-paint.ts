/**
 * Resolves after the next frame. Call before synchronous CPU-heavy work (pure-JS KDFs) so the
 * state just set (a spinner, a disabled pad) is committed to the UI thread before JS blocks.
 */
export function waitForPaint(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));
}
