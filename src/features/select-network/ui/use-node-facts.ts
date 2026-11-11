import Blocks from 'lucide-react-native/icons/blocks';
import CircleCheck from 'lucide-react-native/icons/circle-check';
import CircleDashed from 'lucide-react-native/icons/circle-dashed';
import CircleX from 'lucide-react-native/icons/circle-x';
import LoaderCircle from 'lucide-react-native/icons/loader-circle';
import ShieldCheck from 'lucide-react-native/icons/shield-check';
import ShieldX from 'lucide-react-native/icons/shield-x';
import TriangleAlert from 'lucide-react-native/icons/triangle-alert';
import type { LucideIcon } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { assessNode, network, NODE_SYNC_LAG_BLOCKS } from '@/entities/network';

import type { NodeStatus } from '../model/use-node-checks';
import type { ChipTone } from './status-chip';

export type NodeFact = { key: string; icon: LucideIcon; label: string; tone: ChipTone };

/**
 * The chips of one node row: reachability with latency, the chain check, the latest block and,
 * when the node lags the best one, an "out of sync" flag.
 */
export function useNodeFacts(
  status: NodeStatus | undefined,
  bestHeight: number | null,
): NodeFact[] {
  const { t, i18n } = useTranslation();
  if (status === undefined) {
    return [
      {
        key: 'state',
        icon: CircleDashed,
        label: t('settings.network.status.unchecked'),
        tone: 'neutral',
      },
    ];
  }
  if (status.status === 'checking') {
    return [
      {
        key: 'state',
        icon: LoaderCircle,
        label: t('settings.network.status.checking'),
        tone: 'neutral',
      },
    ];
  }
  const health = assessNode(status, bestHeight, NODE_SYNC_LAG_BLOCKS);
  if (health.status === 'unreachable') {
    return [
      {
        key: 'state',
        icon: CircleX,
        label: t('settings.network.status.unreachable'),
        tone: 'danger',
      },
    ];
  }
  if (health.status === 'wrong-chain') {
    return [
      {
        key: 'chain',
        icon: ShieldX,
        label: t('settings.network.status.wrongChain', { chainId: health.chainId }),
        tone: 'danger',
      },
    ];
  }
  if (status.status !== 'reachable') return [];
  const facts: NodeFact[] = [
    {
      key: 'state',
      icon: CircleCheck,
      label: t('settings.network.status.reachable', { ms: status.latencyMs }),
      tone: 'success',
    },
    {
      key: 'chain',
      icon: ShieldCheck,
      label: t('settings.network.status.chainOk', { chainId: network.chainId }),
      tone: 'neutral',
    },
    {
      key: 'block',
      icon: Blocks,
      label:
        status.blockHeight === null
          ? t('settings.network.status.blockUnknown')
          : t('settings.network.status.block', {
              height: new Intl.NumberFormat(i18n.language).format(status.blockHeight),
            }),
      tone: 'neutral',
    },
  ];
  if (health.status === 'out-of-sync') {
    facts.push({
      key: 'sync',
      icon: TriangleAlert,
      label: t('settings.network.status.outOfSync', { count: health.blocksBehind }),
      tone: 'warning',
    });
  }
  return facts;
}
