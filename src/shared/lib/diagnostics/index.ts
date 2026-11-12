export { canCapture, canSend, UNKNOWN_CONSENT, type ReportingConsent } from './consent';
export {
  addNavigationBreadcrumb,
  applyErrorReportingConsent,
  flushErrorReports,
  getErrorReportingHost,
  initErrorReporting,
  isErrorReportingAvailable,
  sendTestErrorReport,
} from './error-reporting';
export { logger, redact } from './logger';
export { QUEUE_MAX_REPORTS } from './report-queue';
