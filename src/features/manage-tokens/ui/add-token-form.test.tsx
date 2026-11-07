import { fireEvent, render, screen } from '@testing-library/react-native';
import { View } from 'react-native';

import { useTokenStore } from '@/entities/asset';
import { i18n } from '@/shared/i18n';

import { AddTokenForm } from './add-token-form';
import { TokenList } from './token-list';

const TOKEN = '0x5FbDB2315678afecb367f032d93F642f64180aa3';
const EOA = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
const DECIMALS = 6;

// No test hits a real RPC: the provider factory returns a stub token contract at TOKEN.
// Answers are keyed by the ERC-20 function selector (first 4 bytes of the call data).
jest.mock('@/shared/api', () => {
  const coder = jest.requireActual<typeof import('ethers')>('ethers').AbiCoder.defaultAbiCoder();
  const answers: Record<string, string> = {
    '0x95d89b41': coder.encode(['string'], ['CMUX']), // symbol()
    '0x313ce567': coder.encode(['uint256'], [6]), // decimals()
    '0x06fdde03': coder.encode(['string'], ['CointMU Example']), // name()
  };
  return {
    ...jest.requireActual('@/shared/api'),
    createRpcProvider: () => ({
      getCode: jest.fn(async (address: string) =>
        address.toLowerCase() === '0x5fbdb2315678afecb367f032d93f642f64180aa3' ? '0x60' : '0x',
      ),
      call: jest.fn(async ({ data }: { data: string }) => answers[data.slice(0, 10)] ?? '0x'),
      destroy: jest.fn(),
    }),
  };
});

function renderTokens() {
  return render(
    <View>
      <AddTokenForm />
      <TokenList />
    </View>,
  );
}

beforeEach(async () => {
  await i18n.changeLanguage('en');
  useTokenStore.getState().clear();
});

describe('add a custom token', () => {
  it('looks the token up, warns that it is unverified, and adds it on confirmation', async () => {
    await renderTokens();
    await fireEvent.changeText(
      screen.getByLabelText('Token contract address'),
      TOKEN.toLowerCase(),
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Look up' }));

    expect(await screen.findByText('CointMU Example')).toBeOnTheScreen();
    expect(screen.getByText('Unverified token')).toBeOnTheScreen();
    expect(useTokenStore.getState().custom).toEqual({});

    await fireEvent.press(screen.getByRole('button', { name: 'Add token' }));
    const [added] = Object.values(useTokenStore.getState().custom).flat();
    expect(added).toMatchObject({ address: TOKEN, symbol: 'CMUX', decimals: DECIMALS });
    expect(screen.getByRole('switch', { name: 'Show CMUX on Home' })).toBeOnTheScreen();
  });

  it('refuses an address without a contract', async () => {
    await renderTokens();
    await fireEvent.changeText(screen.getByLabelText('Token contract address'), EOA);
    await fireEvent.press(screen.getByRole('button', { name: 'Look up' }));
    expect(
      await screen.findByText('There is no contract at this address on CointMU.'),
    ).toBeOnTheScreen();
  });

  it('refuses a mistyped checksum before asking the node', async () => {
    await renderTokens();
    await fireEvent.changeText(
      screen.getByLabelText('Token contract address'),
      TOKEN.replace('FbDB', 'fBDB'),
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Look up' }));
    expect(await screen.findByText(/has a typo/)).toBeOnTheScreen();
  });
});
