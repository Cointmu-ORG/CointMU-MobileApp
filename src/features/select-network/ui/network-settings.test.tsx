import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';

import { network, resolveActiveUrl, useNetworkStore } from '@/entities/network';
import { i18n } from '@/shared/i18n';

import { useNodeChecks } from '../model/use-node-checks';
import { NetworkSettings } from './network-settings';

const OTHER_CHAIN_URL = network.presetUrls[1] as string;
const CUSTOM = 'https://my-node.invalid';
const LAGGING = 'https://lagging.invalid';
const HEAD_HEX = '0x3e8'; // 1000
const LAGGING_HEX = '0x3d4'; // 980

const sends: string[] = [];

// Node 2 answers for chain 1 (Ethereum mainnet); every other node is a CointMU node. The
// lagging node is 20 blocks behind the others.
jest.mock('@/shared/api', () => ({
  ...jest.requireActual('@/shared/api'),
  createRpcProvider: ({ url }: { url: string }) => ({
    send: jest.fn(async (method: string) => {
      sends.push(`${url} ${method}`);
      if (method === 'eth_chainId') return url === 'https://rpc2.test.invalid' ? '0x1' : '0x778';
      return url === 'https://lagging.invalid' ? '0x3d4' : '0x3e8';
    }),
    getBalance: jest.fn(async () => 0n),
    destroy: jest.fn(),
  }),
}));

function Harness() {
  return <NetworkSettings checks={useNodeChecks()} />;
}

beforeEach(async () => {
  await i18n.changeLanguage('en');
  sends.length = 0;
  useNetworkStore.setState({ selectedUrl: null, customUrls: [] });
});

afterEach(() => jest.restoreAllMocks());

describe('NetworkSettings', () => {
  it('pings every node on open and shows latency, chain and block height', async () => {
    await render(<Harness />);

    expect(await screen.findByText('Wrong network (chain 1)')).toBeOnTheScreen();
    expect(await screen.findByText(/^Reachable · \d+ ms$/)).toBeOnTheScreen();
    expect(screen.getByText('Chain 1912')).toBeOnTheScreen();
    expect(screen.getByText('Block 1,000')).toBeOnTheScreen();
    expect(screen.getByText('In use')).toBeOnTheScreen();
    expect(Number(HEAD_HEX)).toBeGreaterThan(Number(LAGGING_HEX));
  });

  it('flags a node that lags the best one', async () => {
    useNetworkStore.setState({ customUrls: [LAGGING] });
    await render(<Harness />);

    expect(await screen.findByText('Out of sync · 20 blocks behind')).toBeOnTheScreen();
    expect(screen.getByText('Block 980')).toBeOnTheScreen();
  });

  it('refuses to switch to a node on another chain', async () => {
    await render(<Harness />);
    expect(await screen.findByText('Wrong network (chain 1)')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('radio', { name: 'Node 2' }));

    expect(
      await screen.findByText(
        'That node is on chain 1, not CointMU (1912). Muvo keeps using the current one.',
      ),
    ).toBeOnTheScreen();
    expect(resolveActiveUrl(useNetworkStore.getState())).not.toBe(OTHER_CHAIN_URL);
    expect(screen.getByRole('radio', { name: 'Node 1' })).toBeChecked();
  });

  it('adds several custom nodes, switches to the new one and removes one again', async () => {
    await render(<Harness />);
    await fireEvent.changeText(screen.getByLabelText('RPC URL'), ` ${CUSTOM} `);
    await fireEvent.press(screen.getByRole('button', { name: 'Add and use' }));
    await waitFor(() => expect(useNetworkStore.getState().selectedUrl).toBe(CUSTOM));
    expect(await screen.findByRole('radio', { name: 'Your node 1' })).toBeChecked();

    await fireEvent.changeText(screen.getByLabelText('RPC URL'), LAGGING);
    await fireEvent.press(screen.getByRole('button', { name: 'Add and use' }));
    expect(await screen.findByRole('radio', { name: 'Your node 2' })).toBeChecked();
    expect(useNetworkStore.getState().customUrls).toEqual([CUSTOM, LAGGING]);

    await fireEvent.press(screen.getByRole('button', { name: 'Remove Your node 2' }));
    expect(useNetworkStore.getState().customUrls).toEqual([CUSTOM]);
    // The node in use was removed, so calls go back to the default.
    expect(resolveActiveUrl(useNetworkStore.getState())).toBe(network.presetUrls[0]);
  });

  it('rejects a URL that is not http(s) and one that is already listed', async () => {
    await render(<Harness />);
    await fireEvent.changeText(screen.getByLabelText('RPC URL'), 'my-node.invalid');
    await fireEvent.press(screen.getByRole('button', { name: 'Add and use' }));
    expect(await screen.findByText('Enter an http:// or https:// URL.')).toBeOnTheScreen();

    await fireEvent.changeText(screen.getByLabelText('RPC URL'), network.presetUrls[0] as string);
    await fireEvent.press(screen.getByRole('button', { name: 'Add and use' }));
    expect(await screen.findByText('That node is already in the list.')).toBeOnTheScreen();
    expect(useNetworkStore.getState().customUrls).toEqual([]);
  });

  it('pings again on "Ping all" and when Muvo returns to the foreground', async () => {
    let emit: (state: AppStateStatus) => void = () => undefined;
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, handler) => {
      emit = handler as typeof emit;
      return { remove: jest.fn() };
    });
    await render(<Harness />);
    await screen.findByText('Wrong network (chain 1)');
    const afterOpen = sends.length;

    await fireEvent.press(screen.getByRole('button', { name: 'Ping all' }));
    await waitFor(() => expect(sends.length).toBeGreaterThan(afterOpen));
    await screen.findByRole('button', { name: 'Ping all' });
    const afterPingAll = sends.length;

    // Backgrounding stops the run; nothing is pinged until Muvo is active again.
    await act(() => emit('background'));
    expect(sends.length).toBe(afterPingAll);
    await act(() => emit('active'));
    await waitFor(() => expect(sends.length).toBeGreaterThan(afterPingAll));
  });
});
