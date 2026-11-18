import { fireEvent, render, screen } from '@testing-library/react-native';

import { useTxStore, type LocalTxRecord, type TxStatus } from '@/entities/transaction';
import { useWalletStore } from '@/entities/wallet';
import { i18n } from '@/shared/i18n';
import { DEFAULT_APPEARANCE, useAppearanceStore } from '@/shared/model';

import { seedWalletRecord } from '../../../../jest.seed-wallet';
import { TxDetailPage } from './tx-detail-page';

// Public Hardhat test accounts; never hold real funds.
const FROM = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
const OWN_SECOND = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
const STRANGER = '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC';
const HASH = `0x${'cd'.repeat(32)}`;
/** 1.234567891 CMU: more decimals than the default display setting (6). */
const VALUE = 1_234_567_891n * 10n ** 9n;

jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  useLocalSearchParams: () => ({ hash: `0x${'cd'.repeat(32)}` }),
}));
// No test hits a real RPC: the fee paid is read from the receipt once mined.
jest.mock('@/shared/api', () => ({
  ...jest.requireActual('@/shared/api'),
  createRpcProvider: () => ({
    getTransactionReceipt: jest.fn(async () => ({ fee: 42_000n })),
    destroy: jest.fn(),
  }),
}));

function addRecord(to: string, status: TxStatus): void {
  const record: LocalTxRecord = {
    hash: HASH,
    from: FROM,
    to,
    value: VALUE.toString(),
    assetKey: 'native',
    nonce: 0,
    fee: { mode: 'legacy', gasLimit: '21000', gasPrice: '1' },
    node: 'http://rpc.test.invalid',
    createdAt: 0,
    status,
    confirmations: status === 'pending' ? 0 : 2,
    blockNumber: status === 'pending' ? null : 7,
    unknownSince: null,
  };
  useTxStore.getState().clear();
  useTxStore.getState().add(record);
}

beforeEach(async () => {
  await i18n.changeLanguage('en');
  useAppearanceStore.setState(DEFAULT_APPEARANCE);
  const walletId = seedWalletRecord({ source: 'mnemonic', address: FROM });
  useWalletStore.getState().activate();
  useWalletStore.getState().addAccount(walletId, { index: 1, address: OWN_SECOND });
});

describe('TxDetailPage in plain language', () => {
  it('names a stranger by short address, shows plain status words and no block jargon', async () => {
    addRecord(STRANGER, 'pending');
    await render(<TxDetailPage />);

    expect(screen.getByRole('header', { name: 'Sent to 0x3C44…93BC' })).toBeOnTheScreen();
    expect(screen.getByText('1.234567')).toBeOnTheScreen();
    expect(screen.getAllByLabelText('Sending').length).toBeGreaterThan(0);
    expect(screen.getByText('This usually takes under a minute.')).toBeOnTheScreen();
    expect(screen.getByText('Calculated when completed')).toBeOnTheScreen();
    expect(screen.queryByText(/block|mined/i)).toBeNull();
  });

  it('names an own account, and shows the fee paid once confirmed', async () => {
    addRecord(OWN_SECOND, 'confirmed');
    await render(<TxDetailPage />);

    expect(screen.getByRole('header', { name: 'Sent to Account 2' })).toBeOnTheScreen();
    expect(await screen.findByText('0.000000000000042 CMU')).toBeOnTheScreen();
  });

  it('keeps Technical details collapsed until opened', async () => {
    addRecord(STRANGER, 'confirmed');
    await render(<TxDetailPage />);
    expect(screen.queryByText(HASH)).toBeNull();
    expect(screen.queryByText('2 of 12')).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Technical details' }));

    expect(screen.getByText(HASH)).toBeOnTheScreen();
    expect(screen.getByText('2 of 12')).toBeOnTheScreen();
    expect(screen.getByText('7')).toBeOnTheScreen();
    expect(screen.getByText(STRANGER)).toBeOnTheScreen();
    expect(screen.getByText('rpc.test.invalid')).toBeOnTheScreen();
  });
});
