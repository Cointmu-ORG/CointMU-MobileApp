import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { Share, StyleSheet, type ViewStyle } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { NATIVE_ASSET } from '@/entities/asset';
import { useTxStore, type LocalTxRecord, type TxStatus } from '@/entities/transaction';
import { useWalletStore } from '@/entities/wallet';
import { i18n } from '@/shared/i18n';
import { DEFAULT_APPEARANCE, useAppearanceStore } from '@/shared/model';

import { seedWalletRecord } from '../../../../jest.seed-wallet';
import { useSendFlowStore, type SendDraft, type SendOutcome } from '../model/send-flow-store';
import { SendStatus } from './send-status';

// Public Hardhat test accounts; never hold real funds.
const FROM = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
const TO = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
const HASH = `0x${'ab'.repeat(32)}`;
const SENT: SendOutcome = { ok: true, hash: HASH, isUncertain: false };
const UNCERTAIN: SendOutcome = { ok: true, hash: HASH, isUncertain: true };
const BOTTOM_INSET = 34;
const SAFE_AREA = {
  frame: { x: 0, y: 0, width: 320, height: 568 },
  insets: { top: 20, right: 0, bottom: BOTTOM_INSET, left: 0 },
};
/** 1.234567891 CMU: more decimals than the default display setting (6) shows. */
const AMOUNT = 1_234_567_891n * 10n ** 9n;

// No test hits a real RPC: the receipt only reads the fee paid, once the transfer is mined.
jest.mock('@/shared/api', () => ({
  ...jest.requireActual('@/shared/api'),
  createRpcProvider: () => ({
    getTransactionReceipt: jest.fn(async () => ({ fee: 42_000n })),
    destroy: jest.fn(),
  }),
}));

// `from` gets the seeded wallet's id before each test.
const DRAFT: { -readonly [K in keyof SendDraft]: SendDraft[K] } = {
  from: { walletId: '', index: 0, address: FROM },
  asset: NATIVE_ASSET,
  to: TO,
  amount: AMOUNT,
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
  await render(
    <SafeAreaProvider initialMetrics={SAFE_AREA}>
      <SendStatus />
    </SafeAreaProvider>,
  );
}

const title = (name: string) => screen.getByRole('header', { name });
const hasSuccessMark = () => screen.queryByTestId('send-success-mark') !== null;
const doneButton = () => screen.queryByRole('button', { name: 'Done' });

beforeEach(async () => {
  await i18n.changeLanguage('en');
  useAppearanceStore.setState(DEFAULT_APPEARANCE);
  const walletId = seedWalletRecord({ source: 'private-key', address: FROM });
  useWalletStore.getState().activate();
  DRAFT.from = { walletId, index: 0, address: FROM };
  useSendFlowStore.getState().reset();
});

describe('the receipt never shows success before the transfer is confirmed', () => {
  it('signing and broadcasting: the stage, no success, no buttons', async () => {
    await renderStatus({ outcome: null });
    expect(title('Signing on this device…')).toBeOnTheScreen();
    expect(hasSuccessMark()).toBe(false);
    expect(doneButton()).toBeNull();
    expect(screen.queryByTestId('send-result-footer')).toBeNull();
    expect(screen.queryByText('Technical details')).toBeNull();
  });

  it('accepted by the node: "Sending…" in plain words, step 1 done, no success styling', async () => {
    await renderStatus({ outcome: SENT, status: 'pending' });
    expect(title('Sending…')).toBeOnTheScreen();
    expect(screen.getByText('This usually takes under a minute.')).toBeOnTheScreen();
    expect(hasSuccessMark()).toBe(false);
    expect(screen.getByLabelText('Sent: done')).toBeOnTheScreen();
    expect(screen.getByLabelText('Confirmed: in progress')).toBeOnTheScreen();
    expect(screen.getByLabelText('Completed: not yet')).toBeOnTheScreen();
    expect(screen.getByLabelText('Sending')).toBeOnTheScreen();
    expect(doneButton()).toBeOnTheScreen();
  });

  it('a broadcast that timed out: still checking, nothing marked as done', async () => {
    await renderStatus({ outcome: UNCERTAIN, status: 'pending' });
    expect(title('Still checking')).toBeOnTheScreen();
    expect(hasSuccessMark()).toBe(false);
    expect(screen.getByLabelText('Sent: in progress')).toBeOnTheScreen();
  });

  it('confirmed: "Sent!" with the success mark, and no block count in the main text', async () => {
    await renderStatus({ outcome: SENT, status: 'confirmed', confirmations: 4 });
    expect(title('Sent!')).toBeOnTheScreen();
    expect(hasSuccessMark()).toBe(true);
    expect(screen.getByLabelText('Completed: in progress')).toBeOnTheScreen();
    expect(screen.queryByText(/of 12/)).toBeNull();
  });

  it('final: "Completed", every step done', async () => {
    await renderStatus({ outcome: SENT, status: 'final', confirmations: 12 });
    expect(title('Completed')).toBeOnTheScreen();
    expect(hasSuccessMark()).toBe(true);
    expect(screen.getByLabelText('Completed: done')).toBeOnTheScreen();
  });

  it.each([
    ['failed', 'Transfer failed', /amount didn't move/],
    ['dropped', "Didn't go through", /safe to send it again/],
    ['replaced', 'Replaced by another transfer', /Check History/],
  ] as const)(
    '%s: says what happened and what to do, no success, no steps',
    async (status, heading, body) => {
      await renderStatus({ outcome: SENT, status });
      expect(title(heading)).toBeOnTheScreen();
      expect(screen.getByText(body)).toBeOnTheScreen();
      expect(hasSuccessMark()).toBe(false);
      expect(screen.queryByLabelText(/^Completed:/)).toBeNull();
      expect(doneButton()).toBeOnTheScreen();
    },
  );

  it('not sent: the reason, a way to try again, no share and no technical details', async () => {
    await renderStatus({ outcome: { ok: false, error: 'wrongChain' } });
    expect(title('Not sent')).toBeOnTheScreen();
    expect(hasSuccessMark()).toBe(false);
    expect(screen.getByRole('button', { name: 'Edit and try again' })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Share receipt' })).toBeNull();
    expect(screen.queryByText('Technical details')).toBeNull();
  });

  it('follows the poller live: Sending… → Sent! → Completed while the screen is open', async () => {
    await renderStatus({ outcome: SENT, status: 'pending' });
    expect(hasSuccessMark()).toBe(false);

    await act(() => useTxStore.getState().update(HASH, { ...record('confirmed', 1) }));
    expect(title('Sent!')).toBeOnTheScreen();
    expect(hasSuccessMark()).toBe(true);

    await act(() => useTxStore.getState().update(HASH, { ...record('final', 12) }));
    expect(title('Completed')).toBeOnTheScreen();
  });
});

describe('receipt layout and contents', () => {
  it('keeps Done in a footer outside the scroll view, padded above the bottom safe area', async () => {
    await renderStatus({ outcome: SENT, status: 'pending' });
    const footer = screen.getByTestId('send-result-footer');
    expect(within(footer).getByRole('button', { name: 'Done' })).toBeOnTheScreen();
    const style = StyleSheet.flatten(footer.props.style as ViewStyle);
    expect(style?.paddingBottom).toBeGreaterThan(BOTTOM_INSET);
  });

  it('shows the amount with the display decimals, the sender by name and the recipient', async () => {
    await renderStatus({ outcome: SENT, status: 'pending' });
    expect(screen.getByTestId('receipt-amount')).toHaveTextContent('1.234567');
    expect(screen.getByText('Account 1')).toBeOnTheScreen();
    expect(screen.getByText('0x7099…79C8')).toBeOnTheScreen();
    expect(screen.getByText('Up to 0.000000000000021 CMU')).toBeOnTheScreen();
  });

  it('shows the fee actually paid once the transfer is in a block', async () => {
    await renderStatus({ outcome: SENT, status: 'confirmed', confirmations: 1 });
    expect(await screen.findByText('0.000000000000042 CMU')).toBeOnTheScreen();
  });

  it('hides Technical details until opened; then the id, "n of 12" and the node', async () => {
    await renderStatus({ outcome: SENT, status: 'confirmed', confirmations: 4 });
    expect(screen.queryByText(HASH)).toBeNull();
    expect(screen.getByRole('button', { name: 'Technical details' })).toBeCollapsed();

    await fireEvent.press(screen.getByRole('button', { name: 'Technical details' }));

    expect(screen.getByText(HASH)).toBeOnTheScreen();
    expect(screen.getByText('4 of 12')).toBeOnTheScreen();
    expect(screen.getByText('rpc.test.invalid')).toBeOnTheScreen();
  });

  it('shares a plain-text receipt with what the receipt shows', async () => {
    const share = jest
      .spyOn(Share, 'share')
      .mockResolvedValue({ action: 'sharedAction', activityType: undefined });
    await renderStatus({ outcome: SENT, status: 'confirmed', confirmations: 4 });

    await fireEvent.press(screen.getByRole('button', { name: 'Share receipt' }));

    expect(share).toHaveBeenCalledTimes(1);
    const message = share.mock.calls[0]?.[0].message ?? '';
    expect(message).toContain('Muvo transfer receipt');
    expect(message).toContain('Amount: 1.234567 CMU');
    expect(message).toContain('To: 0x7099…79C8');
    expect(message).toMatch(/Date: .+/);
    expect(message).toContain('Status: Confirmed');
    expect(message).toContain(`Transaction ID: ${HASH}`);
    share.mockRestore();
  });
});
