import { useCallback, useEffect, useState } from 'react';

import { probeNode, type NodeProbe } from '@/entities/network';

export type NodeStatus = NodeProbe | { readonly status: 'checking' };

/** Checks every listed node on mount and on demand; one entry per URL. */
export function useNodeProbes(urls: readonly string[]) {
  const [statuses, setStatuses] = useState<Readonly<Record<string, NodeStatus>>>({});
  const urlKey = urls.join(',');

  const setStatus = useCallback((url: string, status: NodeStatus) => {
    setStatuses((current) => ({ ...current, [url]: status }));
  }, []);

  const checkAll = useCallback(async () => {
    const targets = urlKey.split(',').filter(Boolean);
    targets.forEach((url) => setStatus(url, { status: 'checking' }));
    await Promise.all(targets.map(async (url) => setStatus(url, await probeNode(url))));
  }, [urlKey, setStatus]);

  useEffect(() => {
    void checkAll();
  }, [checkAll]);

  return { statuses, setStatus, checkAll };
}
