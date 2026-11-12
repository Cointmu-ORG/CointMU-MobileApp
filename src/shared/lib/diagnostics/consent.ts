/**
 * The user's reporting choice, same model as the desktop app. `isEnabled` is null until the
 * stored choice has loaded, so an error from early startup can be saved but not sent.
 */
export type ReportingConsent = {
  readonly isEnabled: boolean | null;
  readonly isNoticeAcknowledged: boolean;
};

export const UNKNOWN_CONSENT: ReportingConsent = { isEnabled: null, isNoticeAcknowledged: false };

/** True while an error may be captured into the local queue. */
export function canCapture(consent: ReportingConsent): boolean {
  return consent.isEnabled !== false;
}

/** True only once reporting is on and the one-time notice was acknowledged. */
export function canSend(consent: ReportingConsent): boolean {
  return consent.isEnabled === true && consent.isNoticeAcknowledged;
}
