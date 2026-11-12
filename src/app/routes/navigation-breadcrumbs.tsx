import { useSegments } from 'expo-router';
import { useEffect } from 'react';

import { addNavigationBreadcrumb } from '@/shared/lib';

/**
 * Records the open screen for error reports as a route pattern (`/tx/[hash]`), never a URL with
 * its params (D-77). A component of its own, rendering nothing: `useSegments()` re-renders its
 * caller on every navigation, which the root layout must not do.
 */
export function NavigationBreadcrumbs() {
  const routePattern = `/${useSegments().join('/')}`;
  useEffect(() => addNavigationBreadcrumb(routePattern), [routePattern]);
  return null;
}
