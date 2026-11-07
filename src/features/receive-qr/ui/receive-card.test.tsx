import * as Clipboard from 'expo-clipboard';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Share } from 'react-native';

import { useWalletStore } from '@/entities/wallet';
import { i18n } from '@/shared/i18n';

import { ReceiveCard } from './receive-card';

const CHECKSUMMED = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn(async () => true) }));

beforeEach(async () => {
  await i18n.changeLanguage('en');
  // Stored lowercase on purpose: the QR, copy and share must still use the checksummed form.
  useWalletStore.getState().startPinSetup(CHECKSUMMED.toLowerCase(), 'mnemonic');
  useWalletStore.getState().activate();
});

describe('ReceiveCard', () => {
  it('shows the checksummed address and the account name', async () => {
    await render(<ReceiveCard />);
    expect(screen.getByText(CHECKSUMMED)).toBeOnTheScreen();
    expect(screen.getByText('Account 1')).toBeOnTheScreen();
    expect(screen.getByLabelText('QR code of your address')).toBeOnTheScreen();
    expect(screen.getByText(/Only send CMU or CointMU tokens/)).toBeOnTheScreen();
  });

  it('copies and shares only the address', async () => {
    const share = jest
      .spyOn(Share, 'share')
      .mockResolvedValue({ action: 'sharedAction', activityType: undefined });
    await render(<ReceiveCard />);
    await fireEvent.press(screen.getByRole('button', { name: 'Copy address' }));
    expect(Clipboard.setStringAsync).toHaveBeenCalledWith(CHECKSUMMED);
    expect(await screen.findByRole('button', { name: 'Address copied' })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Share address' }));
    expect(share).toHaveBeenCalledWith({ message: CHECKSUMMED });
  });
});
