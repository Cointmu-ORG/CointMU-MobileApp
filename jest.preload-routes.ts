import { readdirSync } from 'node:fs';
import path from 'node:path';

const APP_DIR = path.join(__dirname, 'app');
const ROUTE_FILE = /\.tsx?$/;

/**
 * Loads every route module under app/ while the test file loads, outside any test timeout.
 *
 * renderRouter('./app') requires the route files lazily during the first render, so the first
 * test of a router suite also paid for loading the whole app (1–2 s alone, several times that
 * with every Jest worker busy) against the 5 s test timeout. Jest caches modules per test file,
 * so renderRouter then finds them already loaded. Call it at module scope, after jest.mock().
 */
export function preloadRoutes(dir: string = APP_DIR): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) preloadRoutes(fullPath);
    else if (ROUTE_FILE.test(entry.name)) jest.requireActual(fullPath);
  }
}
