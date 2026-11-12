import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { useWalletStore } from '@/entities/wallet';
import { i18n } from '@/shared/i18n';
import { MOTION } from '@/shared/ui';

import { MnemonicQuiz } from './mnemonic-quiz';

import { seedWallet } from '../../../../jest.seed-wallet';

const PHRASE =
  'abandon ability able about above absent absorb abstract absurd abuse access accident';
const WORDS = PHRASE.split(' ');
const ADDRESS = '0x0000000000000000000000000000000000000001';
// Always picks the first positions: the quiz asks for words #1, #2 and #3.
const firstPositions = () => 0;

async function renderQuiz() {
  const walletId = await seedWallet({
    secret: { kind: 'mnemonic', phrase: PHRASE },
    address: ADDRESS,
    origin: 'created',
  });
  await render(<MnemonicQuiz walletId={walletId} randomInt={firstPositions} />);
  return screen.findAllByLabelText(/^Word #\d$/);
}

beforeEach(async () => {
  await i18n.changeLanguage('en');
  useWalletStore.getState().reset();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('MnemonicQuiz', () => {
  it('blocks activation when a word is wrong', async () => {
    jest.useFakeTimers();
    const [first, second, third] = await renderQuiz();
    await fireEvent.changeText(first, WORDS[0]);
    await fireEvent.changeText(second, 'wrong');
    await fireEvent.changeText(third, WORDS[2]);
    await fireEvent.press(screen.getByRole('button', { name: 'Verify' }));

    expect(
      await screen.findByText("That word doesn't match. Check what you wrote down."),
    ).toBeOnTheScreen();
    expect(screen.getAllByText('Correct')).toHaveLength(2);
    // Past the success delay, the wallet must still be waiting for its backup.
    await act(() => jest.advanceTimersByTime(MOTION.slowMs * 2));
    expect(useWalletStore.getState().status).toBe('pendingBackup');
  });

  it('moves on to PIN setup once every word is right', async () => {
    const fields = await renderQuiz();
    for (const [index, field] of fields.entries()) {
      await fireEvent.changeText(field, `  ${WORDS[index]?.toUpperCase()} `);
    }
    await fireEvent.press(screen.getByRole('button', { name: 'Verify' }));

    await waitFor(() => expect(useWalletStore.getState().status).toBe('pendingPin'));
  });
});
