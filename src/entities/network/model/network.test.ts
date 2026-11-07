import { createRpcProvider } from '@/shared/api';

import { getProvider } from '../api/provider';
import { probeNode } from '../api/probe-node';
import { network } from '../config/network';
import { listNodes, resolveActiveUrl, useNetworkStore } from './network-store';

const COINTMU_HEX = '0x778'; // 1912
const CUSTOM = 'https://my-node.invalid';

jest.mock('@/shared/api', () => ({
  ...jest.requireActual('@/shared/api'),
  createRpcProvider: jest.fn(),
}));

function mockNode(send: () => Promise<unknown>) {
  jest
    .mocked(createRpcProvider)
    .mockImplementation(({ url }) => ({ url, send: jest.fn(send), destroy: jest.fn() }) as never);
}

beforeEach(() => useNetworkStore.setState({ selectedUrl: null, customUrl: null }));

describe('probeNode', () => {
  it('reports latency for a CointMU node', async () => {
    mockNode(async () => COINTMU_HEX);
    const clock = jest.fn().mockReturnValueOnce(1_000).mockReturnValueOnce(1_120);
    await expect(probeNode(CUSTOM, clock)).resolves.toEqual({
      status: 'reachable',
      latencyMs: 120,
    });
  });

  it('flags a node on another chain', async () => {
    mockNode(async () => '0x1');
    await expect(probeNode(CUSTOM)).resolves.toEqual({ status: 'wrong-chain', chainId: 1 });
  });

  it('treats errors and junk answers as unreachable', async () => {
    mockNode(async () => {
      throw new Error('ECONNREFUSED');
    });
    await expect(probeNode(CUSTOM)).resolves.toEqual({ status: 'unreachable' });
    mockNode(async () => 'not-hex');
    await expect(probeNode(CUSTOM)).resolves.toEqual({ status: 'unreachable' });
  });
});

describe('active node', () => {
  it('defaults to the first preset and lists the custom node last', () => {
    expect(resolveActiveUrl({ selectedUrl: null, customUrl: null })).toBe(network.presetUrls[0]);
    expect(listNodes(CUSTOM).map((node) => node.isCustom)).toEqual([false, false, true]);
  });

  it('falls back to the default when the stored choice no longer exists', () => {
    expect(resolveActiveUrl({ selectedUrl: 'https://gone.invalid', customUrl: null })).toBe(
      network.presetUrls[0],
    );
  });

  it('falls back when the selected custom node is removed', () => {
    useNetworkStore.getState().setCustomUrl(CUSTOM);
    useNetworkStore.getState().select(CUSTOM);
    useNetworkStore.getState().setCustomUrl(null);
    expect(useNetworkStore.getState().selectedUrl).toBeNull();
  });

  it('rebuilds the provider when the selection changes', () => {
    mockNode(async () => COINTMU_HEX);
    const first = getProvider() as unknown as { url: string };
    expect(first.url).toBe(network.presetUrls[0]);
    useNetworkStore.getState().select(network.presetUrls[1] as string);
    expect((getProvider() as unknown as { url: string }).url).toBe(network.presetUrls[1]);
  });
});
