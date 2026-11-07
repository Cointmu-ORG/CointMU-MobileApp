import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { network, resolveActiveUrl, useNetworkStore } from '@/entities/network';
import { i18n } from '@/shared/i18n';

import { NetworkSettings } from './network-settings';

const OTHER_CHAIN_URL = network.presetUrls[1] as string;
const CUSTOM = 'https://my-node.invalid';

// Node 2 answers for chain 1 (Ethereum mainnet); every other node is a CointMU node.
jest.mock('@/shared/api', () => ({
  ...jest.requireActual('@/shared/api'),
  createRpcProvider: ({ url }: { url: string }) => ({
    send: jest.fn(async () => (url === 'https://rpc2.test.invalid' ? '0x1' : '0x778')),
    getBalance: jest.fn(async () => 0n),
    destroy: jest.fn(),
  }),
}));

beforeEach(async () => {
  await i18n.changeLanguage('en');
  useNetworkStore.setState({ selectedUrl: null, customUrl: null });
});

describe('NetworkSettings', () => {
  it('refuses to switch to a node on another chain', async () => {
    await render(<NetworkSettings />);
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

  it('adds a custom CointMU node and switches to it', async () => {
    await render(<NetworkSettings />);
    await fireEvent.changeText(screen.getByLabelText('RPC URL'), ` ${CUSTOM} `);
    await fireEvent.press(screen.getByRole('button', { name: 'Add and use' }));

    await waitFor(() => expect(useNetworkStore.getState().selectedUrl).toBe(CUSTOM));
    expect(await screen.findByRole('radio', { name: 'Your node' })).toBeChecked();
  });

  it('rejects a URL that is not http(s)', async () => {
    await render(<NetworkSettings />);
    await fireEvent.changeText(screen.getByLabelText('RPC URL'), 'my-node.invalid');
    await fireEvent.press(screen.getByRole('button', { name: 'Add and use' }));
    expect(await screen.findByText('Enter an http:// or https:// URL.')).toBeOnTheScreen();
    expect(useNetworkStore.getState().customUrl).toBeNull();
  });
});
