import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { PIN_KDF, pinHasher, readPinRecord, useSessionStore } from '@/entities/auth';
import { useWalletStore } from '@/entities/wallet';
import { i18n } from '@/shared/i18n';

import { SetupPinFlow } from './setup-pin-flow';

const PIN = '135790';

async function typePin(pin: string) {
  for (const digit of pin) {
    await fireEvent.press(screen.getByRole('button', { name: digit }));
  }
}

beforeEach(async () => {
  await i18n.changeLanguage('en');
  useSessionStore.getState().lock();
  useWalletStore.setState({ status: 'pendingPin' });
});

afterEach(() => jest.restoreAllMocks());

describe('SetupPinFlow', () => {
  it('hashes once, after the confirmation, and shows progress while it runs', async () => {
    const realHash = pinHasher.hash.bind(pinHasher);
    const hash = jest.spyOn(pinHasher, 'hash');
    let finishHash: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      finishHash = resolve;
    });
    hash.mockImplementation(async (pin) => {
      await gate;
      return realHash(pin);
    });

    await render(<SetupPinFlow />);
    await typePin(PIN);
    expect(hash).not.toHaveBeenCalled();
    await typePin(PIN);

    expect(await screen.findByText('Securing your PIN…')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: '1' })).toBeDisabled();
    finishHash();

    await waitFor(() => expect(useWalletStore.getState().status).toBe('active'));
    expect(hash).toHaveBeenCalledTimes(1);
    await expect(readPinRecord()).resolves.toMatchObject({
      v: PIN_KDF.version,
      iterations: PIN_KDF.iterations,
    });
  });

  it('does not hash when the confirmation does not match', async () => {
    const hash = jest.spyOn(pinHasher, 'hash');
    await render(<SetupPinFlow />);
    await typePin(PIN);
    await typePin('000000');
    expect(await screen.findByText("The PINs don't match. Start again.")).toBeOnTheScreen();
    expect(hash).not.toHaveBeenCalled();
  });
});
