import { canCapture, canSend, UNKNOWN_CONSENT } from './consent';
import { formatRelease, resolveReportingConfig, type ReportingSource } from './reporting-config';

const SOURCE: ReportingSource = {
  dsn: 'http://publickey@10.64.24.120:8000/1',
  version: '1.1.0',
  commitShort: '0123456',
  channel: 'dev',
  build: null,
  hasNativeSdk: false,
  os: { name: 'ios', version: '18.1' },
};

describe('resolveReportingConfig', () => {
  it('names the release, environment and dist from the build', () => {
    expect(resolveReportingConfig({ ...SOURCE, channel: 'release', build: '42' })).toEqual({
      ok: true,
      config: {
        dsn: SOURCE.dsn,
        host: '10.64.24.120:8000',
        release: 'muvo@1.1.0+0123456',
        environment: 'release',
        dist: '42',
      },
    });
  });

  it('has no dist in Expo Go, which has no build number of ours', () => {
    const result = resolveReportingConfig(SOURCE);
    expect(result.ok && result.config.dist).toBeUndefined();
  });

  it('is off, without a problem to report, when the build has no DSN', () => {
    expect(resolveReportingConfig({ ...SOURCE, dsn: null })).toEqual({
      ok: false,
      problem: 'missing',
    });
  });

  it.each([
    'not a url',
    'ftp://key@host.invalid/1',
    'https://host.invalid/1',
    'https://key@host.invalid',
    'https://key@host.invalid/project',
  ])('is off for the invalid DSN %s', (dsn) => {
    expect(resolveReportingConfig({ ...SOURCE, dsn })).toEqual({
      ok: false,
      problem: 'invalid-dsn',
    });
  });
});

describe('formatRelease', () => {
  it('leaves the commit out when the bundle was made without git', () => {
    expect(formatRelease('1.1.0', null)).toBe('muvo@1.1.0');
  });
});

describe('consent', () => {
  it.each([
    ['unknown (still loading)', UNKNOWN_CONSENT, true, false],
    ['on, notice not read', { isEnabled: true, isNoticeAcknowledged: false }, true, false],
    ['on, notice read', { isEnabled: true, isNoticeAcknowledged: true }, true, true],
    ['off', { isEnabled: false, isNoticeAcknowledged: true }, false, false],
  ])('%s', (_name, consent, capture, send) => {
    expect(canCapture(consent)).toBe(capture);
    expect(canSend(consent)).toBe(send);
  });
});
