import { fireEvent, render, screen } from '@testing-library/react-native';

import { i18n } from '@/shared/i18n';
import { DEFAULT_ERROR_REPORTING, useErrorReportingStore } from '@/shared/model';

import { ErrorReportingSettings } from './error-reporting-settings';
import { SendTestErrorRow } from './send-test-error-row';

const mockReporting = { isAvailable: true, isTestSent: true };

jest.mock('@/shared/lib', () => ({
  ...jest.requireActual('@/shared/lib'),
  isErrorReportingAvailable: () => mockReporting.isAvailable,
  getErrorReportingHost: () => 'glitchtip.test.invalid',
  sendTestErrorReport: () => mockReporting.isTestSent,
}));

beforeEach(async () => {
  mockReporting.isAvailable = true;
  mockReporting.isTestSent = true;
  await i18n.changeLanguage('en');
  useErrorReportingStore.setState({ ...DEFAULT_ERROR_REPORTING, hasHydrated: true });
});

describe('ErrorReportingSettings', () => {
  it('shows the switch, where reports go, the offline rule and what a report holds', async () => {
    await render(<ErrorReportingSettings />);
    expect(screen.getByLabelText('Send error reports').props.value).toBe(true);
    expect(screen.getByText(/CointMU server at glitchtip\.test\.invalid/)).toBeOnTheScreen();
    expect(
      screen.getByText(/wait on this phone \(the newest 30, for up to 30 days\)/),
    ).toBeOnTheScreen();
    expect(screen.getByText('Wallet addresses and transaction hashes')).toBeOnTheScreen();
    expect(screen.getByText(/Screenshots, what is on the screen, and clipboard/)).toBeOnTheScreen();
  });

  it('saves the choice the moment the switch moves', async () => {
    await render(<ErrorReportingSettings />);
    await fireEvent(screen.getByLabelText('Send error reports'), 'valueChange', false);
    expect(useErrorReportingStore.getState().isEnabled).toBe(false);
    expect(screen.getByLabelText('Send error reports').props.value).toBe(false);
  });

  it('says so, in Indonesian too, when the build has no DSN', async () => {
    mockReporting.isAvailable = false;
    await i18n.changeLanguage('id');
    await render(<ErrorReportingSettings />);
    expect(screen.getByText(/Pelaporan galat belum diatur di build ini/)).toBeOnTheScreen();
    expect(screen.queryByLabelText('Kirim laporan galat')).toBeNull();
  });
});

describe('SendTestErrorRow', () => {
  it('says the test report was saved', async () => {
    await render(<SendTestErrorRow />);
    await fireEvent.press(screen.getByRole('button', { name: /^Send test error/ }));
    expect(screen.getByText(/Test report saved/)).toBeOnTheScreen();
  });

  it('says nothing was sent while reporting is off or not set up', async () => {
    mockReporting.isTestSent = false;
    await render(<SendTestErrorRow />);
    await fireEvent.press(screen.getByRole('button', { name: /^Send test error/ }));
    expect(screen.getByText(/Nothing was sent/)).toBeOnTheScreen();
  });
});
