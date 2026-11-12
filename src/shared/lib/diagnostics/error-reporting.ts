import * as Sentry from '@sentry/react-native';
import { Platform } from 'react-native';

import { env, getAppInfo, getBuildInfo, isRunningInExpoGo } from '../../config';
import { logger, setLogSink, type LogEntry } from './logger';
import { canCapture, canSend, UNKNOWN_CONSENT, type ReportingConsent } from './consent';
import { createReportQueue, QUEUE_MAX_REPORTS, type ReportQueue } from './report-queue';
import { makeReportTransport } from './report-transport';
import {
  resolveReportingConfig,
  type ReportingConfig,
  type ReportingSource,
} from './reporting-config';
import { BREADCRUMB_CATEGORY, scrubBreadcrumb, scrubEvent } from './scrub-event';

const MAX_BREADCRUMBS = 30;
const MAX_VALUE_LENGTH = 1000;
const SENTRY_LEVEL = { info: 'info', warn: 'warning', error: 'error' } as const;

// Public test vectors (the Hardhat phrase, its account #0 and that account's key): a test
// report carries them on purpose, so GlitchTip shows whether the scrubbing works.
const TEST_ADDRESS = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
const TEST_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const TEST_PHRASE = 'test test test test test test test test test test test junk';
const TEST_PIN = '135790';

let config: ReportingConfig | null = null;
let source: ReportingSource | null = null;
let queue: ReportQueue | null = null;
let consent: ReportingConsent = UNKNOWN_CONSENT;
let isRunning = false;

function readReportingSource(): ReportingSource {
  const app = getAppInfo();
  const build = getBuildInfo();
  return {
    dsn: env.glitchtipDsn,
    version: app.version,
    commitShort: build.commitShort,
    channel: build.channel,
    build: app.build,
    hasNativeSdk: !isRunningInExpoGo(),
    os: { name: Platform.OS, version: String(Platform.Version) },
  };
}

/**
 * The only integrations that run. Console, fetch, touch and navigation breadcrumbs, screenshots,
 * the view hierarchy, sessions, replay, tracing and profiling are deliberately absent.
 */
function buildIntegrations(hasNativeSdk: boolean) {
  const integrations = [
    Sentry.reactNativeErrorHandlersIntegration(),
    Sentry.dedupeIntegration(),
    Sentry.createReactNativeRewriteFrames(),
  ];
  // Phone model and OS version come from the native SDK; Expo Go has none (see initialScope).
  return hasNativeSdk ? [...integrations, Sentry.deviceContextIntegration()] : integrations;
}

function start(active: ReportingConfig, from: ReportingSource, reports: ReportQueue): void {
  Sentry.init({
    dsn: active.dsn,
    release: active.release,
    environment: active.environment,
    dist: active.dist,
    defaultIntegrations: false,
    integrations: buildIntegrations(from.hasNativeSdk),
    sendDefaultPii: false,
    attachScreenshot: false,
    attachViewHierarchy: false,
    enableAutoSessionTracking: false,
    enableCaptureFailedRequests: false,
    enableNativeNagger: false,
    maxBreadcrumbs: MAX_BREADCRUMBS,
    maxValueLength: MAX_VALUE_LENGTH,
    // The native SDK's own disk cache (native crashes, dev and release builds only).
    maxCacheItems: QUEUE_MAX_REPORTS,
    initialScope: { contexts: { os: from.os } },
    beforeSend: (event) => (canCapture(consent) ? scrubEvent(event) : null),
    beforeBreadcrumb: scrubBreadcrumb,
    transport: makeReportTransport({ queue: reports, canSend: () => canSend(consent) }),
  });
  isRunning = true;
}

function onLog({ level, message, context, error }: LogEntry): void {
  if (!isRunning) return;
  Sentry.addBreadcrumb({
    category: BREADCRUMB_CATEGORY.log,
    level: SENTRY_LEVEL[level],
    message,
    data: context,
  });
  if (level !== 'error') return;
  if (error === undefined) Sentry.captureMessage(message, SENTRY_LEVEL.error);
  else Sentry.captureException(error);
}

/**
 * Starts error reporting when the build has a GlitchTip DSN (D-77); otherwise does nothing and
 * the app runs with console logs only. Call it once, before the first screen, so startup
 * errors are caught: they are saved on the phone and sent only after the user's choice loads.
 * @param from - This build's public settings; injectable for tests.
 */
export function initErrorReporting(from: ReportingSource = readReportingSource()): void {
  const result = resolveReportingConfig(from);
  if (!result.ok) {
    if (result.problem === 'invalid-dsn') {
      logger.warn('Error reporting is off: EXPO_PUBLIC_GLITCHTIP_DSN is not a valid DSN');
    }
    return;
  }
  config = result.config;
  source = from;
  queue = createReportQueue();
  setLogSink(onLog);
  start(config, source, queue);
}

/**
 * Applies the user's choice at once. Off closes the SDK and deletes unsent reports; on starts
 * it again; a choice that allows sending flushes what was held back.
 */
export async function applyErrorReportingConsent(next: ReportingConsent): Promise<void> {
  consent = next;
  if (config === null || source === null || queue === null) return;
  if (next.isEnabled === false) {
    if (isRunning) {
      isRunning = false;
      await Sentry.close();
    }
    await queue.clear();
    return;
  }
  if (!isRunning) start(config, source, queue);
  if (canSend(next)) await Sentry.flush();
}

/** True when this build has a usable DSN, whatever the user's choice is. */
export function isErrorReportingAvailable(): boolean {
  return config !== null;
}

/** The collector's host for the notice text, or null when reporting is not set up. */
export function getErrorReportingHost(): string | null {
  return config?.host ?? null;
}

/** Tries the waiting reports again now, e.g. when the app returns to the foreground. */
export async function flushErrorReports(): Promise<void> {
  if (isRunning && canSend(consent)) await Sentry.flush();
}

/**
 * Records which screen is open, as a route pattern such as `/tx/[hash]`: never the URL, so no
 * param value (an address, a hash) is ever part of it.
 */
export function addNavigationBreadcrumb(routePattern: string): void {
  if (!isRunning) return;
  Sentry.addBreadcrumb({ category: BREADCRUMB_CATEGORY.navigation, message: routePattern });
}

/**
 * Sends one sample report for the device checklist. Its text holds fake secrets, so the report
 * in GlitchTip must show them redacted.
 * @returns False when reporting is off or not set up, so nothing was captured.
 */
export function sendTestErrorReport(): boolean {
  if (!isRunning || !canCapture(consent)) return false;
  logger.info('Test report requested', { address: TEST_ADDRESS, pin: TEST_PIN });
  Sentry.captureException(
    new Error(
      `Muvo test error. These must arrive redacted: address ${TEST_ADDRESS}, key ${TEST_KEY}, ` +
        `phrase ${TEST_PHRASE}, pin ${TEST_PIN}`,
    ),
  );
  return true;
}
