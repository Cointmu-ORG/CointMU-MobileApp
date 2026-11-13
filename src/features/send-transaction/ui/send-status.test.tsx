import { act, render, screen } from '@testing-library/react-native';

import { NATIVE_ASSET } from '@/entities/asset';
import { useTxStore, type LocalTxRecord, type TxStatus } from '@/entities/transaction';
import { useWalletStore } from '@/entities/wallet';
import { i18n } from '@/shared/i18n';

import { seedWalletRecord } from '../../../../jest.seed-wallet';
import { useSendFlowStore, type SendDraft, type SendOutcome } from '../model/send-flow-store';
import { SendStatus } from './send-status';

// Public Hardhat test accounts; never hold real funds.
const FROM = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
const TO = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
const HASH = `0x${'ab'.repeat(32)}`;
const SENT: SendOutcome = { ok: true, hash: HASH, isUncertain: false };
const UNCERTAIN: SendOutcome = { ok: true, hash: HASH, isUncertain: true };

// `from` gets the seeded wallet's id before each test.
const DRAFT: { -readonly [K in keyof SendDraft]: SendDraft[K] } = {
  from: { walletId: '', index: 0, address: FROM },
  asset: NATIVE_ASSET,
  to: TO,
  amount: 15n * 10n ** 17n,
  quote: { mode: 'legacy', gasLimit: 21_000n, gasPrice: 1n, maxFee: 21_000n, fetchedAt: 0 },
  isSelfSend: false,
  isContractRecipient: false,
};

function record(status: TxStatus, confirmations: number): LocalTxRecord {
  return {
    hash: HASH,
    from: FROM,
    to: TO,
    value: DRAFT.amount.toString(),
    assetKey: 'native',
    nonce: 0,
    fee: { mode: 'legacy', gasLimit: '21000', gasPrice: '1' },
    node: 'http://rpc.test.invalid',
    createdAt: 0,
    status,
    confirmations,
    blockNumber: status === 'pending' ? null : 1,
    unknownSince: null,
  };
}

type Scenario = { outcome: SendOutcome | null; status?: TxStatus; confirmations?: number };

async function renderStatus({ outcome, status, confirmations = 0 }: Scenario) {
  useTxStore.getState().clear();
  if (status) useTxStore.getState().add(record(status, confirmations));
  useSendFlowStore.setState({
    draft: DRAFT,
    stage: outcome === null ? 'signing' : null,
    outcome,
  });
  await render(<SendStatus />);
}

const title = (name: string) => screen.getByRole('header', { name });
const hasSuccessMark = () => screen.queryByTestId('send-success-mark') !== null;
const doneButton = () => screen.queryByRole('button', { name: 'Done' });

beforeEach(async () => {
  await i18n.changeLanguage('en');
  const walletId = seedWalletRecord({ source: 'private-key', address: FROM });
  useWalletStore.getState().activate();
  DRAFT.from = { walletId, index: 0, address: FROM };
  useSendFlowStore.getState().reset();
});

describe('SendStatus maps the real transaction state to what is shown', () => {
  it('signing and broadcasting: a calm loader, the stage, no success and no Done', async () => {
    await renderStatus({ outcome: null });
    expect(title('Signing on this device…')).toBeOnTheScreen();
    expect(screen.getByLabelText('Signing on this device…')).toBeOnTheScreen();
    expect(hasSuccessMark()).toBe(false);
    expect(doneButton()).toBeNull();
    expect(screen.queryByText('Transaction hash')).toBeNull();
  });

  it('accepted by the node: "Sent to the network", still no success styling', async () => {
    await renderStatus({ outcome: SENT, status: 'pending' });
    expect(title('Sent to the network')).toBeOnTheScreen();
    expect(hasSuccessMark()).toBe(false);
    expect(screen.getByLabelText('Sent to the network: done')).toBeOnTheScreen();
    expect(screen.getByLabelText('Confirmed: in progress')).toBeOnTheScreen();
    expect(screen.getByLabelText('Final: not yet')).toBeOnTheScreen();
    expect(screen.getByText(HASH)).toBeOnTheScreen();
    expect(doneButton()).toBeOnTheScreen();
  });

  it('a broadcast that timed out: uncertain, nothing marked as done', async () => {
    await renderStatus({ outcome: UNCERTAIN, status: 'pending' });
    expect(title('Sent, waiting for the network')).toBeOnTheScreen();
    expect(hasSuccessMark()).toBe(false);
    expect(screen.getByLabelText('Sent to the network: in progress')).toBeOnTheScreen();
  });

  it('confirmed: the success mark and n/12', async () => {
    await renderStatus({ outcome: SENT, status: 'confirmed', confirmations: 4 });
    expect(title('Confirmed')).toBeOnTheScreen();
    expect(hasSuccessMark()).toBe(true);
    expect(screen.getByText('4/12')).toBeOnTheScreen();
    expect(screen.getByRole('progressbar', { name: '4 of 12 confirmations' })).toBeOnTheScreen();
    expect(screen.getByLabelText('Final: in progress')).toBeOnTheScreen();
  });

  it('final: every step done', async () => {
    await renderStatus({ outcome: SENT, status: 'final', confirmations: 12 });
    expect(title('Final')).toBeOnTheScreen();
    expect(hasSuccessMark()).toBe(true);
    expect(screen.getByLabelText('Final: done')).toBeOnTheScreen();
  });

  it.each([
    ['failed', 'Failed on the network', /rejected by the contract/],
    ['dropped', 'Dropped by the network', /Nothing was sent/],
    ['replaced', 'Replaced', /same nonce/],
  ] as const)('%s: its own state, no success and no steps', async (status, heading, body) => {
    await renderStatus({ outcome: SENT, status });
    expect(title(heading)).toBeOnTheScreen();
    expect(screen.getByText(body)).toBeOnTheScreen();
    expect(hasSuccessMark()).toBe(false);
    expect(screen.queryByLabelText(/^Final:/)).toBeNull();
    expect(doneButton()).toBeOnTheScreen();
  });

  it('not sent: the reason, a way to try again, and no hash', async () => {
    await renderStatus({ outcome: { ok: false, error: 'wrongChain' } });
    expect(title('Not sent')).toBeOnTheScreen();
    expect(hasSuccessMark()).toBe(false);
    expect(screen.getByRole('button', { name: 'Edit and try again' })).toBeOnTheScreen();
    expect(screen.queryByText('Transaction hash')).toBeNull();
  });

  it('follows the poller live: pending → confirmed → final while the screen is open', async () => {
    await renderStatus({ outcome: SENT, status: 'pending' });
    expect(hasSuccessMark()).toBe(false);

    await act(() => useTxStore.getState().update(HASH, { ...record('confirmed', 1) }));
    expect(title('Confirmed')).toBeOnTheScreen();
    expect(screen.getByText('1/12')).toBeOnTheScreen();
    expect(hasSuccessMark()).toBe(true);

    await act(() => useTxStore.getState().update(HASH, { ...record('final', 12) }));
    expect(title('Final')).toBeOnTheScreen();
  });

  it('shows the sender, the recipient and the exact amount', async () => {
    await renderStatus({ outcome: SENT, status: 'pending' });
    expect(screen.getByText('Account 1')).toBeOnTheScreen();
    expect(screen.getByText('0xf39F…2266')).toBeOnTheScreen();
    expect(screen.getByText('0x7099…79C8')).toBeOnTheScreen();
    expect(screen.getByText('1.5 CMU')).toBeOnTheScreen();
  });
});
