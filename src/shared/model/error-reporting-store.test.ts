import { DEFAULT_ERROR_REPORTING, migrateErrorReporting } from './error-reporting-store';

describe('migrateErrorReporting', () => {
  it('defaults to on (opt-out, like the desktop) with the notice still owed', () => {
    expect(DEFAULT_ERROR_REPORTING).toEqual({ isEnabled: true, isNoticeAcknowledged: false });
    expect(migrateErrorReporting(undefined)).toEqual(DEFAULT_ERROR_REPORTING);
  });

  it('keeps a stored choice', () => {
    const stored = { isEnabled: false, isNoticeAcknowledged: true };
    expect(migrateErrorReporting(stored)).toEqual(stored);
  });

  it.each([null, 'text', 7, [], { isEnabled: 'no', isNoticeAcknowledged: 1 }])(
    'falls back field by field for %p',
    (stored) => {
      expect(migrateErrorReporting(stored)).toEqual(DEFAULT_ERROR_REPORTING);
    },
  );
});
