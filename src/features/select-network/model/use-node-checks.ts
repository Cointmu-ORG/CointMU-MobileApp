import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import {
  listNodes,
  NODE_PROBE_CONCURRENCY,
  probeNode,
  useNetworkStore,
  type NodeOption,
  type NodeProbe,
} from '@/entities/network';
import { mapWithLimit } from '@/shared/lib';

export type NodeStatus = NodeProbe | { readonly status: 'checking' };
type Statuses = Readonly<Record<string, NodeStatus>>;

export type NodeChecks = {
  readonly nodes: readonly NodeOption[];
  /** One entry per node that was pinged or is being pinged. */
  readonly statuses: Statuses;
  readonly isChecking: boolean;
  readonly checkAll: () => Promise<void>;
  readonly setStatus: (url: string, status: NodeStatus) => void;
};

function withoutChecking(statuses: Statuses): Statuses {
  return Object.fromEntries(
    Object.entries(statuses).filter(([, status]) => status.status !== 'checking'),
  );
}

/**
 * Pings every listed node: when the screen opens, on "Ping all" or pull-to-refresh, and when
 * Muvo returns to the foreground. At most NODE_PROBE_CONCURRENCY pings run at once, each with
 * its own timeout. Closing the screen or leaving the foreground stops the run: nodes not yet
 * pinged are skipped and late answers are ignored.
 */
export function useNodeChecks(): NodeChecks {
  const customUrls = useNetworkStore((state) => state.customUrls);
  const [statuses, setStatuses] = useState<Statuses>({});
  const [isChecking, setIsChecking] = useState(false);
  const currentRun = useRef(0);
  const urlKey = listNodes(customUrls)
    .map((node) => node.url)
    .join(',');

  const setStatus = useCallback((url: string, status: NodeStatus) => {
    setStatuses((current) => ({ ...current, [url]: status }));
  }, []);

  const stop = useCallback(() => {
    currentRun.current += 1;
    setIsChecking(false);
    setStatuses(withoutChecking);
  }, []);

  const checkAll = useCallback(async () => {
    currentRun.current += 1;
    const run = currentRun.current;
    const isCurrent = () => currentRun.current === run;
    const urls = urlKey.split(',').filter(Boolean);
    setIsChecking(true);
    setStatuses((current) => ({
      ...current,
      ...Object.fromEntries(urls.map((url) => [url, { status: 'checking' }])),
    }));
    await mapWithLimit(urls, NODE_PROBE_CONCURRENCY, async (url) => {
      if (!isCurrent()) return;
      const probe = await probeNode(url);
      if (isCurrent()) setStatus(url, probe);
    });
    if (isCurrent()) setIsChecking(false);
  }, [urlKey, setStatus]);

  // Ping on open, and again when the list changes. Deferred by a tick so the screen paints its
  // rows first; the cleanup cancels a ping that has not started and stops one that has.
  useEffect(() => {
    const timer = setTimeout(() => void checkAll(), 0);
    return () => {
      clearTimeout(timer);
      stop();
    };
  }, [checkAll, stop]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') void checkAll();
      else stop();
    });
    return () => subscription.remove();
  }, [checkAll, stop]);

  return { nodes: listNodes(customUrls), statuses, isChecking, checkAll, setStatus };
}
