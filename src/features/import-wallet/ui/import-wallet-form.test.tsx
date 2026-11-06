import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { readWalletSecret, useWalletStore } from '@/entities/wallet';
import { i18n } from '@/shared/i18n';

import { ImportWalletForm } from './import-wallet-form';

const KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const ADDRESS = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

beforeEach(async () => {
  await i18n.changeLanguage('en');
  useWalletStore.getState().reset();
});

async function switchTo(name: 'Private key' | 'Recovery phrase') {
  await fireEvent.press(screen.getByRole('radio', { name }));
}

describe('ImportWalletForm', () => {
  it('asks for the backup acknowledgement again after switching modes', async () => {
    await render(<ImportWalletForm />);
    await switchTo('Private key');
    await fireEvent.press(screen.getByRole('checkbox'));
    await switchTo('Recovery phrase');
    await switchTo('Private key');

    expect(screen.getByRole('checkbox')).not.toBeChecked();
    await fireEvent.changeText(screen.getByLabelText('Private key (64 hex characters)'), KEY);
    expect(screen.getByRole('button', { name: 'Import wallet' })).toBeDisabled();
  });

  it('imports a key pasted with a 0X prefix and line breaks, then moves to PIN setup', async () => {
    await render(<ImportWalletForm />);
    await switchTo('Private key');
    const pasted = `0X${KEY.slice(2, 34).toUpperCase()}\n${KEY.slice(34)}\n`;
    await fireEvent.changeText(screen.getByLabelText('Private key (64 hex characters)'), pasted);
    await fireEvent.press(screen.getByRole('checkbox'));
    await fireEvent.press(screen.getByRole('button', { name: 'Import wallet' }));

    await waitFor(() =>
      expect(useWalletStore.getState()).toMatchObject({ status: 'pendingPin', address: ADDRESS }),
    );
    await expect(readWalletSecret()).resolves.toEqual({ kind: 'private-key', privateKey: KEY });
  });

  it('closes the keyboard from the phrase field instead of adding a new line', async () => {
    await render(<ImportWalletForm />);
    const field = screen.getByLabelText('Recovery phrase (12 or 24 words)');
    expect(field.props.submitBehavior).toBe('blurAndSubmit');
  });
});
