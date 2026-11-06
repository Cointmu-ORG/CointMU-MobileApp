import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { network, type NodeProbe } from '@/entities/network';

/** User-facing reason a node was refused. Never shows the raw RPC error. */
export function useFailureMessage() {
  const { t } = useTranslation();
  return useCallback(
    (probe: Exclude<NodeProbe, { status: 'reachable' }>) =>
      probe.status === 'wrong-chain'
        ? t('settings.network.refusedWrongChain', {
            chainId: probe.chainId,
            expected: network.chainId,
          })
        : t('settings.network.refusedUnreachable'),
    [t],
  );
}
