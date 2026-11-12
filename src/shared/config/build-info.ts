import rawBuildInfo from '../../../build-info.json';
import type { AppInfo } from './app-info';

export const BUILD_CHANNELS = ['dev', 'ci', 'preview', 'release'] as const;
export type BuildChannel = (typeof BUILD_CHANNELS)[number];

/** Where this bundle came from (D-72). Public data: nothing here is secret. */
export type BuildInfo = {
  /** Full commit hash; null when the bundle was made without git. */
  readonly commit: string | null;
  readonly commitShort: string | null;
  readonly branch: string | null;
  /** Uncommitted changes at build time; null when unknown. */
  readonly isDirty: boolean | null;
  /** ISO 8601, UTC; null when the file held no valid time. */
  readonly builtAt: string | null;
  readonly channel: BuildChannel;
  readonly ciRun: string | null;
};

const FULL_HASH = /^[0-9a-f]{40}$/;
const SHORT_HASH_LENGTH = 7;
const FALLBACK_CHANNEL: BuildChannel = 'dev';

function readString(value: unknown): string | null {
  return typeof value === 'string' && value !== '' ? value : null;
}

function readChannel(value: unknown): BuildChannel {
  return BUILD_CHANNELS.find((channel) => channel === value) ?? FALLBACK_CHANNEL;
}

/**
 * Validates build-info.json (written by scripts/generate-build-info.js). Each field falls back
 * on its own, so a stale or hand-edited file can never break the About screen.
 */
export function parseBuildInfo(raw: unknown): BuildInfo {
  const fields: Record<string, unknown> = typeof raw === 'object' && raw !== null ? { ...raw } : {};
  const commit = readString(fields.commit);
  const validCommit = commit !== null && FULL_HASH.test(commit) ? commit : null;
  const builtAt = readString(fields.builtAt);
  return {
    commit: validCommit,
    commitShort: validCommit?.slice(0, SHORT_HASH_LENGTH) ?? null,
    branch: readString(fields.branch),
    isDirty: typeof fields.dirty === 'boolean' ? fields.dirty : null,
    builtAt: builtAt !== null && !Number.isNaN(Date.parse(builtAt)) ? builtAt : null,
    channel: readChannel(fields.channel),
    ciRun: readString(fields.ciRun),
  };
}

export function getBuildInfo(): BuildInfo {
  return parseBuildInfo(rawBuildInfo);
}

const UNKNOWN = 'unknown';

type BuildReportInput = {
  readonly app: AppInfo;
  readonly build: BuildInfo;
  /** OS name and version, e.g. "android 35". */
  readonly platform: string;
};

/** The plain-text block "Copy build info" puts on the clipboard for bug reports. English only. */
export function formatBuildReport({ app, build, platform }: BuildReportInput): string {
  const version = app.codename ? `${app.version}-${app.codename}` : app.version;
  const commit = build.commit ?? UNKNOWN;
  const lines = [
    `Muvo ${version} (build ${app.build ?? 'development'})`,
    `Commit: ${build.isDirty ? `${commit} (modified)` : commit}`,
    `Branch: ${build.branch ?? UNKNOWN}`,
    `Built: ${build.builtAt ?? UNKNOWN}`,
    `Channel: ${build.channel}`,
    ...(build.ciRun === null ? [] : [`CI run: ${build.ciRun}`]),
    `Platform: ${platform}`,
  ];
  return lines.join('\n');
}
