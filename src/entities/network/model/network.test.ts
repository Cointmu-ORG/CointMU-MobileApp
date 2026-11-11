import { createRpcProvider } from '@/shared/api';

import { getProvider } from '../api/provider';
import { probeNode } from '../api/probe-node';
import { MAX_NODES, network, NODE_PROBE_TIMEOUT_MS } from '../config/network';
import {
  listNodes,
  migrateNetworkChoice,
  remainingCustomSlots,
  resolveActiveUrl,
  useNetworkStore,
} from './network-store';

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

beforeEach(() => useNetworkStore.setState({ selectedUrl: null, customUrls: [] }));

describe('probeNode', () => {
  it('reports latency for a CointMU node', async () => {
    mockNode(async () => COINTMU_HEX);
    const clock = jest.fn().mockReturnValueOnce(1_000).mockReturnValueOnce(1_120);
    await expect(probeNode(CUSTOM, clock)).resolves.toEqual({
      status: 'reachable',
      latencyMs: 120,
      // The mocked node answers every call with 0x778.
      blockHeight: 1912,
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

describe('probeNode limits', () => {
  it('keeps a node reachable when only the block height call fails', async () => {
    const send = jest.fn(async (method: string) => {
      if (method === 'eth_chainId') return COINTMU_HEX;
      throw new Error('method not found');
    });
    jest
      .mocked(createRpcProvider)
      .mockImplementation(({ url }) => ({ url, send, destroy: jest.fn() }) as never);

    await expect(probeNode(CUSTOM)).resolves.toMatchObject({
      status: 'reachable',
      blockHeight: null,
    });
  });

  it('gives up on a node that never answers, after the probe timeout', async () => {
    jest.useFakeTimers();
    try {
      mockNode(() => new Promise<never>(() => undefined));
      const probe = probeNode(CUSTOM);
      await jest.advanceTimersByTimeAsync(NODE_PROBE_TIMEOUT_MS);
      await expect(probe).resolves.toEqual({ status: 'unreachable' });
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('stored choice migration (D-67)', () => {
  it('turns the single custom node of version 0 into a list', () => {
    expect(migrateNetworkChoice({ selectedUrl: CUSTOM, customUrl: CUSTOM })).toEqual({
      selectedUrl: CUSTOM,
      customUrls: [CUSTOM],
    });
  });

  it('starts empty for a version 0 store without a custom node, or for junk', () => {
    const empty = { selectedUrl: null, customUrls: [] };
    expect(migrateNetworkChoice({ selectedUrl: null, customUrl: null })).toEqual(empty);
    expect(migrateNetworkChoice(undefined)).toEqual(empty);
    expect(migrateNetworkChoice('junk')).toEqual(empty);
  });

  it('drops entries that are not usable nodes', () => {
    const stored = {
      selectedUrl: null,
      customUrls: [CUSTOM, CUSTOM, 'ftp://x.invalid', 42, network.presetUrls[0]],
    };
    expect(migrateNetworkChoice(stored).customUrls).toEqual([CUSTOM]);
  });
});

describe('custom nodes', () => {
  it('holds several, up to the shared limit with the presets', () => {
    const { addCustomUrl } = useNetworkStore.getState();
    const slots = MAX_NODES - network.presetUrls.length;
    for (let index = 0; index <= slots; index += 1) addCustomUrl(`https://n${index}.invalid`);

    const { customUrls } = useNetworkStore.getState();
    expect(customUrls).toHaveLength(slots);
    expect(remainingCustomSlots(customUrls)).toBe(0);
  });

  it('ignores a node that is already listed', () => {
    useNetworkStore.getState().addCustomUrl(CUSTOM);
    useNetworkStore.getState().addCustomUrl(CUSTOM);
    expect(useNetworkStore.getState().customUrls).toEqual([CUSTOM]);
  });
});

describe('active node', () => {
  it('defaults to the first preset and lists the custom node last', () => {
    expect(resolveActiveUrl({ selectedUrl: null, customUrls: [] })).toBe(network.presetUrls[0]);
    expect(listNodes([CUSTOM]).map((node) => node.isCustom)).toEqual([false, false, true]);
  });

  it('falls back to the default when the stored choice no longer exists', () => {
    expect(resolveActiveUrl({ selectedUrl: 'https://gone.invalid', customUrls: [] })).toBe(
      network.presetUrls[0],
    );
  });

  it('falls back when the selected custom node is removed', () => {
    useNetworkStore.getState().addCustomUrl(CUSTOM);
    useNetworkStore.getState().select(CUSTOM);
    useNetworkStore.getState().removeCustomUrl(CUSTOM);
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
