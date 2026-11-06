import { fireEvent, render, screen } from '@testing-library/react-native';

import { attemptPin, readLockoutState, storeNewPin } from '@/entities/auth';
import { i18n } from '@/shared/i18n';

import { ChangePinFlow } from './change-pin-flow';

const OLD_PIN = '135790';
const NEW_PIN = '246801';

async function typePin(pin: string) {
  for (const digit of pin) {
    await fireEvent.press(await screen.findByRole('button', { name: digit }));
  }
}

beforeEach(async () => {
  await i18n.changeLanguage('en');
  await storeNewPin(OLD_PIN);
});

describe('ChangePinFlow', () => {
  it('needs the current PIN, then stores the new one', async () => {
    const onFinished = jest.fn();
    await render(<ChangePinFlow onFinished={onFinished} />);
    expect(await screen.findByText('Enter your current PIN')).toBeOnTheScreen();

    await typePin(OLD_PIN);
    expect(await screen.findByText('Choose a new PIN')).toBeOnTheScreen();
    await typePin(NEW_PIN);
    expect(await screen.findByText('Enter the new PIN again')).toBeOnTheScreen();
    await typePin(NEW_PIN);

    expect(await screen.findByText('PIN changed')).toBeOnTheScreen();
    await expect(attemptPin(NEW_PIN)).resolves.toEqual({ status: 'verified' });
    await expect(attemptPin(OLD_PIN)).resolves.toMatchObject({ status: 'wrong-pin' });

    await fireEvent.press(screen.getByRole('button', { name: 'Done' }));
    expect(onFinished).toHaveBeenCalledTimes(1);
  });

  it('refuses a wrong current PIN and counts it toward the lockout', async () => {
    await render(<ChangePinFlow onFinished={jest.fn()} />);
    await typePin('000000');
    expect(await screen.findByText('Wrong PIN')).toBeOnTheScreen();
    expect(screen.queryByText('Choose a new PIN')).toBeNull();
    expect((await readLockoutState()).failedCount).toBe(1);
  });
});
