import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert, type AlertButton } from 'react-native';

import { readPinRecord, storeNewPin, useSessionStore } from '@/entities/auth';
import { readWalletSecret, saveWalletSecret, useWalletStore } from '@/entities/wallet';
import { i18n } from '@/shared/i18n';

import { RemoveWalletFlow } from './remove-wallet-flow';

const PIN = '135790';
const ADDRESS = '0x0000000000000000000000000000000000000001';

async function typePin(pin: string) {
  for (const digit of pin) {
    await fireEvent.press(await screen.findByRole('button', { name: digit }));
  }
}

beforeEach(async () => {
  await i18n.changeLanguage('en');
  await saveWalletSecret({
    kind: 'mnemonic',
    phrase: 'test test test test test test test test test test test junk',
  });
  await storeNewPin(PIN);
  useWalletStore.getState().startPinSetup(ADDRESS, 'mnemonic');
  useWalletStore.getState().activate();
  useSessionStore.getState().unlock();
});

afterEach(() => jest.restoreAllMocks());

describe('RemoveWalletFlow', () => {
  it('needs the acknowledgement, the PIN and a final confirmation before it wipes', async () => {
    const alert = jest.spyOn(Alert, 'alert');
    await render(<RemoveWalletFlow onCancel={jest.fn()} />);

    const remove = screen.getByRole('button', { name: 'Remove wallet' });
    expect(remove).toBeDisabled();
    await fireEvent.press(screen.getByRole('checkbox'));
    await fireEvent.press(remove);

    await typePin(PIN);
    await waitFor(() => expect(alert).toHaveBeenCalledTimes(1));
    expect(useWalletStore.getState().status).toBe('active');

    const buttons = alert.mock.calls[0]?.[2] as AlertButton[];
    buttons.find((button) => button.style === 'destructive')?.onPress?.();

    await waitFor(() => expect(useWalletStore.getState().status).toBe('none'));
    await expect(readWalletSecret()).resolves.toBeNull();
    await expect(readPinRecord()).resolves.toBeNull();
  });

  it('keeps the wallet when the PIN is wrong', async () => {
    const alert = jest.spyOn(Alert, 'alert');
    await render(<RemoveWalletFlow onCancel={jest.fn()} />);
    await fireEvent.press(screen.getByRole('checkbox'));
    await fireEvent.press(screen.getByRole('button', { name: 'Remove wallet' }));
    await typePin('000000');
    expect(await screen.findByText('Wrong PIN')).toBeOnTheScreen();
    expect(alert).not.toHaveBeenCalled();
    expect(useWalletStore.getState().status).toBe('active');
  });
});
