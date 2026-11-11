import type { NodeProbe } from '../api/probe-node';
import { assessNode, bestBlockHeight } from './node-health';

const LAG = 10;
const node = (blockHeight: number | null): NodeProbe => ({
  status: 'reachable',
  latencyMs: 40,
  blockHeight,
});

describe('bestBlockHeight', () => {
  it('is the highest block among nodes that passed the chain check', () => {
    const probes: (NodeProbe | undefined)[] = [
      node(100),
      node(120),
      node(null),
      undefined,
      { status: 'unreachable' },
      { status: 'wrong-chain', chainId: 1 },
    ];
    expect(bestBlockHeight(probes)).toBe(120);
  });

  it('is null when no node reported a height', () => {
    expect(bestBlockHeight([{ status: 'unreachable' }, node(null)])).toBeNull();
    expect(bestBlockHeight([])).toBeNull();
  });
});

describe('assessNode', () => {
  it('is healthy at the head and up to the threshold behind it', () => {
    expect(assessNode(node(120), 120, LAG)).toEqual({ status: 'healthy' });
    expect(assessNode(node(110), 120, LAG)).toEqual({ status: 'healthy' });
  });

  it('flags a node that lags the best one by more than the threshold', () => {
    expect(assessNode(node(109), 120, LAG)).toEqual({ status: 'out-of-sync', blocksBehind: 11 });
  });

  it('does not flag a node when there is nothing to compare', () => {
    expect(assessNode(node(null), 120, LAG)).toEqual({ status: 'healthy' });
    expect(assessNode(node(5), null, LAG)).toEqual({ status: 'healthy' });
  });

  it('reports a wrong chain and an unreachable node as they are, whatever the heights', () => {
    expect(assessNode({ status: 'wrong-chain', chainId: 1 }, 120, LAG)).toEqual({
      status: 'wrong-chain',
      chainId: 1,
    });
    expect(assessNode({ status: 'unreachable' }, 120, LAG)).toEqual({ status: 'unreachable' });
  });
});
