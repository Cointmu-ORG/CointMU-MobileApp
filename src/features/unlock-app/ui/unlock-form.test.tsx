import { fireEvent, render, screen } from '@testing-library/react-native';

import {
  createPbkdf2PinHasher,
  PIN_KDF,
  useSessionStore,
  writeLockoutState,
  writePinRecord,
} from '@/entities/auth';
import { i18n } from '@/shared/i18n';

import { UnlockForm } from './unlock-form';

const PIN = '135790';
const WRONG_PIN = '000000';
const FREE_ATTEMPTS = 4;
const RESET_AFTER = 10;
// Same params as production, cheaper cost so the suite stays fast.
const hasher = createPbkdf2PinHasher({ ...PIN_KDF, iterations: 10 });

async function setUp(failedCount = 0) {
  await writePinRecord(await hasher.hash(PIN));
  await writeLockoutState({ failedCount, lockoutUntil: null, lastSeenAt: 0 });
  const onResetRequested = jest.fn();
  await render(<UnlockForm onResetRequested={onResetRequested} />);
  await screen.findByText('Enter your PIN');
  return onResetRequested;
}

async function typePin(pin: string) {
  for (const digit of pin) {
    await fireEvent.press(await screen.findByRole('button', { name: digit }));
  }
}

beforeEach(async () => {
  await i18n.changeLanguage('en');
  useSessionStore.getState().lock();
});

describe('UnlockForm', () => {
  it('shows the wrong-PIN error and stays locked', async () => {
    await setUp();
    await typePin(WRONG_PIN);
    expect(await screen.findByText('Wrong PIN')).toBeOnTheScreen();
    expect(useSessionStore.getState().isUnlocked).toBe(false);
  });

  it('starts the lockout countdown and disables the pad after the free attempts', async () => {
    await setUp(FREE_ATTEMPTS);
    await typePin(WRONG_PIN);
    expect(
      await screen.findByText(/^Too many wrong attempts\. Try again in 0:(30|29)\.$/),
    ).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: '1' })).toBeDisabled();
  });

  it('offers a wallet reset after too many failures', async () => {
    const onResetRequested = await setUp(RESET_AFTER - 1);
    await typePin(WRONG_PIN);
    await fireEvent.press(await screen.findByRole('button', { name: 'Reset wallet' }));
    expect(onResetRequested).toHaveBeenCalledTimes(1);
  });

  it('unlocks with the right PIN', async () => {
    await setUp();
    await typePin(PIN);
    // The session unlocks after the short success animation.
    await screen.findByText('Enter your PIN');
    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(useSessionStore.getState().isUnlocked).toBe(true);
  });
});
