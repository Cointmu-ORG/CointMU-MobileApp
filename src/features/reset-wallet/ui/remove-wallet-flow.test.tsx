import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert, type AlertButton } from 'react-native';

import { readPinRecord, storeNewPin, useSessionStore } from '@/entities/auth';
import { readWalletSecret, useWalletStore } from '@/entities/wallet';
import { i18n } from '@/shared/i18n';

import { RemoveWalletFlow } from './remove-wallet-flow';

import { addWallet, seedWallet } from '../../../../jest.seed-wallet';

const PIN = '135790';
const ADDRESS = '0x0000000000000000000000000000000000000001';
const OTHER_ADDRESS = '0x0000000000000000000000000000000000000002';
// Public Hardhat test key; never holds real funds.
const OTHER_KEY = '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d';
let walletId = '';

async function typePin(pin: string) {
  for (const digit of pin) {
    await fireEvent.press(await screen.findByRole('button', { name: digit }));
  }
}

beforeEach(async () => {
  await i18n.changeLanguage('en');
  await storeNewPin(PIN);
  walletId = await seedWallet({
    secret: {
      kind: 'mnemonic',
      phrase: 'test test test test test test test test test test test junk',
    },
    address: ADDRESS,
  });
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
    await expect(readWalletSecret(walletId)).resolves.toBeNull();
    await expect(readPinRecord()).resolves.toBeNull();
  });

  it('removes only the named wallet when there are several, and keeps the PIN', async () => {
    const otherId = await addWallet({
      secret: { kind: 'private-key', privateKey: OTHER_KEY },
      address: OTHER_ADDRESS,
    });
    const alert = jest.spyOn(Alert, 'alert');
    const onRemoved = jest.fn();
    await render(
      <RemoveWalletFlow walletId={otherId} onCancel={jest.fn()} onRemoved={onRemoved} />,
    );

    expect(screen.getByText('Remove Wallet 2')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('checkbox'));
    await fireEvent.press(screen.getByRole('button', { name: 'Remove wallet' }));
    await typePin(PIN);
    await waitFor(() => expect(alert).toHaveBeenCalledTimes(1));
    const buttons = alert.mock.calls[0]?.[2] as AlertButton[];
    buttons.find((button) => button.style === 'destructive')?.onPress?.();

    await waitFor(() => expect(onRemoved).toHaveBeenCalledTimes(1));
    expect(useWalletStore.getState()).toMatchObject({ status: 'active', activeWalletId: walletId });
    expect(useWalletStore.getState().wallets).toHaveLength(1);
    await expect(readWalletSecret(otherId)).resolves.toBeNull();
    await expect(readWalletSecret(walletId)).resolves.not.toBeNull();
    await expect(readPinRecord()).resolves.not.toBeNull();
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
