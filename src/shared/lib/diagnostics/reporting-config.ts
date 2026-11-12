const APP_NAME = 'muvo';
const ALLOWED_DSN_PROTOCOLS: readonly string[] = ['http:', 'https:'];
const PROJECT_ID_PATTERN = /^\/(?:.+\/)?\d+$/;

/** Everything error reporting needs to know about this build. Public data only. */
export type ReportingSource = {
  /** `EXPO_PUBLIC_GLITCHTIP_DSN`, or null when the build has none. */
  readonly dsn: string | null;
  readonly version: string;
  readonly commitShort: string | null;
  /** Build channel: dev, ci or release. */
  readonly channel: string;
  /** Native build number; null in Expo Go. */
  readonly build: string | null;
  /** True when the Sentry native module is in the binary (not in Expo Go). */
  readonly hasNativeSdk: boolean;
  readonly os: { readonly name: string; readonly version: string };
};

export type ReportingConfig = {
  readonly dsn: string;
  /** Collector host, shown to the user in the notice and in Settings > Privacy. */
  readonly host: string;
  readonly release: string;
  readonly environment: string;
  readonly dist: string | undefined;
};

export type ReportingConfigResult =
  | { readonly ok: true; readonly config: ReportingConfig }
  | { readonly ok: false; readonly problem: 'missing' | 'invalid-dsn' };

/** `muvo@<version>+<short commit>`; without git the commit part is left out. */
export function formatRelease(version: string, commitShort: string | null): string {
  const base = `${APP_NAME}@${version}`;
  return commitShort === null ? base : `${base}+${commitShort}`;
}

function parseDsnHost(dsn: string): string | null {
  try {
    const url = new URL(dsn);
    const isComplete =
      ALLOWED_DSN_PROTOCOLS.includes(url.protocol) &&
      url.username !== '' &&
      url.hostname !== '' &&
      PROJECT_ID_PATTERN.test(url.pathname);
    return isComplete ? url.host : null;
  } catch {
    // Not a URL at all; reported as invalid-dsn by the caller.
    return null;
  }
}

/**
 * Turns the build's public settings into the reporting config. No DSN means reporting is off by
 * design; a DSN that is not `http(s)://<key>@<host>/<project id>` also turns it off.
 */
export function resolveReportingConfig(source: ReportingSource): ReportingConfigResult {
  if (source.dsn === null) return { ok: false, problem: 'missing' };
  const host = parseDsnHost(source.dsn);
  if (host === null) return { ok: false, problem: 'invalid-dsn' };
  return {
    ok: true,
    config: {
      dsn: source.dsn,
      host,
      release: formatRelease(source.version, source.commitShort),
      environment: source.channel,
      dist: source.build ?? undefined,
    },
  };
}
