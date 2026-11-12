import type { ErrorEvent } from '@sentry/core';

import { REPORT_QUEUE_KEY } from './report-queue';
import type { ReportingSource } from './reporting-config';

type SentryMock = Record<
  'init' | 'close' | 'flush' | 'addBreadcrumb' | 'captureException' | 'captureMessage',
  jest.Mock
>;

type StorageMock = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
};

const ADDRESS = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
const SOURCE: ReportingSource = {
  dsn: 'http://publickey@glitchtip.test.invalid/1',
  version: '1.1.0',
  commitShort: '0123456',
  channel: 'dev',
  build: null,
  hasNativeSdk: false,
  os: { name: 'ios', version: '18.1' },
};
const ON = { isEnabled: true, isNoticeAcknowledged: true };
const OFF = { isEnabled: false, isNoticeAcknowledged: true };

/** A fresh copy of the module (it holds the SDK state) with the logger and SDK stub it uses. */
function load() {
  jest.resetModules();
  const reporting = jest.requireActual<typeof import('./error-reporting')>('./error-reporting');
  const { logger } = jest.requireActual<typeof import('./logger')>('./logger');
  const sentry = jest.requireMock<SentryMock>('@sentry/react-native');
  // The storage mock is recreated with the modules, so the test must use the same copy.
  const storageModule = jest.requireMock<StorageMock & { default?: StorageMock }>(
    '@react-native-async-storage/async-storage',
  );
  const storage = storageModule.default ?? storageModule;
  return { reporting, logger, sentry, storage };
}

let warn: jest.SpyInstance;

beforeEach(() => {
  for (const level of ['info', 'error'] as const) {
    jest.spyOn(console, level).mockImplementation(() => undefined);
  }
  warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => jest.restoreAllMocks());

describe('without a DSN', () => {
  it('never starts the SDK and every call is a quiet no-op', async () => {
    const { reporting, logger, sentry } = load();
    reporting.initErrorReporting({ ...SOURCE, dsn: null });
    await reporting.applyErrorReportingConsent(ON);
    await reporting.flushErrorReports();
    reporting.addNavigationBreadcrumb('/send');
    logger.error('Something failed', { error: new Error('boom') });

    expect(reporting.isErrorReportingAvailable()).toBe(false);
    expect(reporting.getErrorReportingHost()).toBeNull();
    expect(reporting.sendTestErrorReport()).toBe(false);
    for (const call of Object.values(sentry)) expect(call).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });

  it('stays off, with one warning, for a DSN that is not valid', () => {
    const { reporting, sentry } = load();
    reporting.initErrorReporting({ ...SOURCE, dsn: 'glitchtip.test.invalid' });
    expect(reporting.isErrorReportingAvailable()).toBe(false);
    expect(sentry.init).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledTimes(1);
  });
});

describe('with a DSN', () => {
  it('starts the SDK with the build names and every data collection option off', () => {
    const { reporting, sentry } = load();
    reporting.initErrorReporting(SOURCE);

    expect(reporting.isErrorReportingAvailable()).toBe(true);
    expect(reporting.getErrorReportingHost()).toBe('glitchtip.test.invalid');
    const [options] = sentry.init.mock.calls[0];
    expect(options).toMatchObject({
      dsn: SOURCE.dsn,
      release: 'muvo@1.1.0+0123456',
      environment: 'dev',
      dist: undefined,
      defaultIntegrations: false,
      sendDefaultPii: false,
      attachScreenshot: false,
      attachViewHierarchy: false,
      enableAutoSessionTracking: false,
      enableCaptureFailedRequests: false,
      maxCacheItems: 30,
    });
    for (const sampling of ['tracesSampleRate', 'replaysSessionSampleRate', 'enableLogs']) {
      expect(options).not.toHaveProperty(sampling);
    }
    const names = options.integrations.map((integration: { name: string }) => integration.name);
    expect(names).toEqual(['ReactNativeErrorHandlers', 'Dedupe', 'RewriteFrames']);
  });

  it('adds the device context only where the native SDK exists', () => {
    const { reporting, sentry } = load();
    reporting.initErrorReporting({ ...SOURCE, hasNativeSdk: true });
    const names = sentry.init.mock.calls[0][0].integrations.map(
      (integration: { name: string }) => integration.name,
    );
    expect(names).toContain('DeviceContext');
  });

  it('scrubs every event and breadcrumb the SDK hands over', () => {
    const { reporting, sentry } = load();
    reporting.initErrorReporting(SOURCE);
    const { beforeSend, beforeBreadcrumb } = sentry.init.mock.calls[0][0];

    const event: ErrorEvent = { type: undefined, message: `to ${ADDRESS}`, user: { id: '1' } };
    expect(beforeSend(event)).toMatchObject({ message: 'to 0x…redacted', breadcrumbs: [] });
    expect(beforeSend(event).user).toBeUndefined();
    expect(beforeBreadcrumb({ category: 'console', message: 'x' })).toBeNull();
    expect(beforeBreadcrumb({ category: 'log', message: ADDRESS }).message).toBe('0x…redacted');
  });

  it('routes logger lines into the SDK: breadcrumbs, and errors as reports', () => {
    const { reporting, logger, sentry } = load();
    reporting.initErrorReporting(SOURCE);
    const failure = new Error('boom');

    logger.warn('Balance failed', { pin: '135790', attempt: 2 });
    logger.error('Integrity check failed', { error: failure });
    logger.error('No error object here');

    expect(sentry.addBreadcrumb).toHaveBeenCalledTimes(3);
    expect(sentry.addBreadcrumb).toHaveBeenNthCalledWith(1, {
      category: 'log',
      level: 'warning',
      message: 'Balance failed',
      data: { pin: '[REDACTED]', attempt: 2 },
    });
    expect(sentry.captureException).toHaveBeenCalledTimes(1);
    expect(sentry.captureException).toHaveBeenCalledWith(failure);
    expect(sentry.captureMessage).toHaveBeenCalledWith('No error object here', 'error');
  });

  it('records a screen as a navigation breadcrumb', () => {
    const { reporting, sentry } = load();
    reporting.initErrorReporting(SOURCE);
    reporting.addNavigationBreadcrumb('/tx/[hash]');
    expect(sentry.addBreadcrumb).toHaveBeenCalledWith({
      category: 'navigation',
      message: '/tx/[hash]',
    });
  });
});

describe('consent', () => {
  it('saves but does not send before the stored choice has loaded', async () => {
    const { reporting, sentry } = load();
    reporting.initErrorReporting(SOURCE);
    const { beforeSend } = sentry.init.mock.calls[0][0];
    expect(beforeSend({ type: undefined, message: 'early' })).not.toBeNull();
    await reporting.flushErrorReports();
    expect(sentry.flush).not.toHaveBeenCalled();
  });

  it('holds reports until the notice is acknowledged, then flushes them', async () => {
    const { reporting, sentry } = load();
    reporting.initErrorReporting(SOURCE);

    await reporting.applyErrorReportingConsent({ isEnabled: true, isNoticeAcknowledged: false });
    expect(sentry.flush).not.toHaveBeenCalled();

    await reporting.applyErrorReportingConsent(ON);
    expect(sentry.flush).toHaveBeenCalledTimes(1);
    expect(sentry.close).not.toHaveBeenCalled();
  });

  it('off closes the SDK at once, deletes unsent reports and captures nothing more', async () => {
    const { reporting, logger, sentry, storage } = load();
    reporting.initErrorReporting(SOURCE);
    await storage.setItem(REPORT_QUEUE_KEY, '{"v":1,"items":[]}');
    const { beforeSend } = sentry.init.mock.calls[0][0];

    await reporting.applyErrorReportingConsent(OFF);

    expect(sentry.close).toHaveBeenCalledTimes(1);
    await expect(storage.getItem(REPORT_QUEUE_KEY)).resolves.toBeNull();
    expect(beforeSend({ type: undefined, message: 'late' })).toBeNull();

    logger.error('After opting out', { error: new Error('boom') });
    reporting.addNavigationBreadcrumb('/send');
    expect(sentry.captureException).not.toHaveBeenCalled();
    expect(sentry.addBreadcrumb).not.toHaveBeenCalled();
    expect(reporting.sendTestErrorReport()).toBe(false);
  });

  it('on again starts the SDK again', async () => {
    const { reporting, sentry } = load();
    reporting.initErrorReporting(SOURCE);
    await reporting.applyErrorReportingConsent(OFF);
    await reporting.applyErrorReportingConsent(ON);

    expect(sentry.init).toHaveBeenCalledTimes(2);
    expect(reporting.sendTestErrorReport()).toBe(true);
    expect(sentry.captureException).toHaveBeenCalledTimes(1);
  });
});
