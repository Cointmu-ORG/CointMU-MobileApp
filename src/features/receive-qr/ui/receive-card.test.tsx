import * as Clipboard from 'expo-clipboard';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Share } from 'react-native';

import { useWalletStore } from '@/entities/wallet';
import { i18n } from '@/shared/i18n';

import { ReceiveCard } from './receive-card';

import { seedWalletRecord } from '../../../../jest.seed-wallet';

const CHECKSUMMED = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn(async () => true) }));

beforeEach(async () => {
  await i18n.changeLanguage('en');
  // Stored lowercase on purpose: the QR, copy and share must still use the checksummed form.
  seedWalletRecord({ source: 'mnemonic', address: CHECKSUMMED.toLowerCase() });
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

  // Device feedback: the note looked clipped at the right edge. The whole sentence must be one
  // wrapping text (no line limit) in both languages.
  it.each(['en', 'id'])('shows the whole note without a line limit (%s)', async (language) => {
    await i18n.changeLanguage(language);
    await render(<ReceiveCard />);
    const note = screen.getByText(i18n.t('receive.note'));
    expect(note.props.numberOfLines).toBeUndefined();
    expect(note.props.ellipsizeMode).toBeUndefined();
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
