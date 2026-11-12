import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { useSessionStore } from '@/entities/auth';
import { useWalletStore } from '@/entities/wallet';
import { i18n } from '@/shared/i18n';
import { DEFAULT_ERROR_REPORTING, useErrorReportingStore } from '@/shared/model';

import { ErrorReportingNoticeGate } from './error-reporting-notice-gate';

import { seedWalletRecord } from '../../../jest.seed-wallet';

const ADDRESS = '0x0000000000000000000000000000000000000001';
const mockReporting = { isAvailable: true };

jest.mock('@/shared/lib', () => ({
  ...jest.requireActual('@/shared/lib'),
  isErrorReportingAvailable: () => mockReporting.isAvailable,
  getErrorReportingHost: () => 'glitchtip.test.invalid',
}));

const notice = () => screen.queryByTestId('error-reporting-notice');

function activateWallet() {
  seedWalletRecord({ source: 'mnemonic', address: ADDRESS });
  useWalletStore.getState().activate();
}

beforeEach(async () => {
  mockReporting.isAvailable = true;
  await i18n.changeLanguage('en');
  useWalletStore.getState().reset();
  useSessionStore.getState().lock();
  useErrorReportingStore.setState({ ...DEFAULT_ERROR_REPORTING, hasHydrated: true });
});

describe('ErrorReportingNoticeGate', () => {
  it('shows the notice once the PIN is set, with what is sent and the switch on', async () => {
    await render(<ErrorReportingNoticeGate />);
    expect(notice()).toBeNull();

    // What finishing onboarding does: unlock, then activate.
    await act(() => {
      useSessionStore.getState().unlock();
      activateWallet();
    });

    expect(
      screen.getByRole('header', { name: 'Error reports help us fix Muvo' }),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(/Reports go to the CointMU server at glitchtip\.test\.invalid/),
    ).toBeOnTheScreen();
    expect(screen.getByText('Error type and message')).toBeOnTheScreen();
    expect(screen.getByText('Recovery phrases, private keys and your PIN')).toBeOnTheScreen();
    expect(screen.getByLabelText('Send error reports').props.value).toBe(true);
  });

  it('shows it to an existing install on the next unlock, never on the lock screen', async () => {
    activateWallet();
    await render(<ErrorReportingNoticeGate />);
    expect(notice()).toBeNull();

    await act(() => useSessionStore.getState().unlock());
    expect(notice()).not.toBeNull();

    await act(() => useSessionStore.getState().lock());
    expect(notice()).toBeNull();
  });

  it('Got it keeps reporting on and never shows the notice again', async () => {
    activateWallet();
    useSessionStore.getState().unlock();
    await render(<ErrorReportingNoticeGate />);

    await fireEvent.press(screen.getByRole('button', { name: 'Got it' }));

    expect(notice()).toBeNull();
    expect(useErrorReportingStore.getState()).toMatchObject({
      isEnabled: true,
      isNoticeAcknowledged: true,
    });
  });

  it('the switch in the notice turns reporting off before anything is sent', async () => {
    activateWallet();
    useSessionStore.getState().unlock();
    await render(<ErrorReportingNoticeGate />);

    await fireEvent(screen.getByLabelText('Send error reports'), 'valueChange', false);
    expect(useErrorReportingStore.getState().isEnabled).toBe(false);
    expect(notice()).not.toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Got it' }));
    expect(useErrorReportingStore.getState()).toMatchObject({
      isEnabled: false,
      isNoticeAcknowledged: true,
    });
  });

  it('stays away when the build has no DSN, or before the stored choice has loaded', async () => {
    activateWallet();
    useSessionStore.getState().unlock();
    mockReporting.isAvailable = false;
    const view = await render(<ErrorReportingNoticeGate />);
    expect(notice()).toBeNull();

    mockReporting.isAvailable = true;
    await act(() => useErrorReportingStore.setState({ hasHydrated: false }));
    await view.rerender(<ErrorReportingNoticeGate />);
    expect(notice()).toBeNull();
  });
});
