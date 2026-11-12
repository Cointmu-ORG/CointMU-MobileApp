import type { Breadcrumb, ErrorEvent, Exception, StackFrame } from '@sentry/core';

import { REDACTED, scrubFilename, scrubText } from './scrub-text';

/** The only breadcrumbs that exist: lines from our logger, and route patterns. */
export const BREADCRUMB_CATEGORY = { log: 'log', navigation: 'navigation' } as const;

const ALLOWED_CATEGORIES: ReadonlySet<string> = new Set(Object.values(BREADCRUMB_CATEGORY));
/** A value under one of these names is dropped whatever it holds. */
const SENSITIVE_KEY_PATTERN =
  /pin|mnemonic|phrase|seed|secret|private|password|passcode|clipboard|paste|signature|signed/i;
const MAX_DATA_DEPTH = 4;
const MAX_DATA_ENTRIES = 30;
const TRUNCATED = '[truncated]';
const ROUTE_PARAMS_START = /[?#]/;

type Dict = Record<string, unknown>;

function isDict(value: unknown): value is Dict {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function scrubEntries(source: Dict, depth: number): Dict {
  const entries = Object.entries(source).slice(0, MAX_DATA_ENTRIES);
  return Object.fromEntries(
    entries.map(([key, value]) => [
      scrubText(key),
      SENSITIVE_KEY_PATTERN.test(key) ? REDACTED.value : scrubData(value, depth + 1),
    ]),
  );
}

/**
 * Scrubs free-form data (a log line's context) all the way down: strings are sanitized, values
 * under a sensitive name are dropped, and anything that is not plain data becomes a short label.
 */
export function scrubData(value: unknown, depth = 0): unknown {
  if (typeof value === 'string') return scrubText(value);
  if (typeof value === 'number' || typeof value === 'boolean' || value === null) return value;
  if (typeof value === 'bigint') return scrubText(value.toString());
  if (value instanceof Error) return scrubText(`${value.name}: ${value.message}`);
  if (typeof value !== 'object') return undefined;
  if (depth >= MAX_DATA_DEPTH) return TRUNCATED;
  if (Array.isArray(value)) {
    return value.slice(0, MAX_DATA_ENTRIES).map((item) => scrubData(item, depth + 1));
  }
  return scrubEntries({ ...value }, depth);
}

function pickStrings(source: unknown, keys: readonly string[]): Dict | undefined {
  if (!isDict(source)) return undefined;
  const picked: Dict = {};
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string') picked[key] = scrubText(value);
    else if (typeof value === 'number') picked[key] = value;
  }
  return Object.keys(picked).length > 0 ? picked : undefined;
}

/**
 * Keeps only breadcrumbs Muvo records itself. A log line keeps its scrubbed message and context;
 * a navigation breadcrumb keeps the route pattern only, never params or a query.
 * @returns The reduced breadcrumb, or null to drop it (console, fetch, touch, native, ...).
 */
export function scrubBreadcrumb(crumb: Breadcrumb): Breadcrumb | null {
  if (!crumb.category || !ALLOWED_CATEGORIES.has(crumb.category)) return null;
  const base = { timestamp: crumb.timestamp, category: crumb.category, level: crumb.level };
  if (crumb.category === BREADCRUMB_CATEGORY.navigation) {
    const route = crumb.message?.split(ROUTE_PARAMS_START)[0];
    return { ...base, message: route === undefined ? undefined : scrubText(route) };
  }
  const data = isDict(crumb.data) ? scrubEntries(crumb.data, 0) : undefined;
  return { ...base, message: crumb.message && scrubText(crumb.message), data };
}

function scrubFrame(frame: StackFrame): StackFrame {
  return {
    filename: frame.filename && scrubFilename(frame.filename),
    function: frame.function && scrubText(frame.function),
    lineno: frame.lineno,
    colno: frame.colno,
    in_app: frame.in_app,
  };
}

function scrubException(exception: Exception): Exception {
  const frames = exception.stacktrace?.frames;
  return {
    type: exception.type && scrubText(exception.type),
    value: exception.value && scrubText(exception.value),
    mechanism: exception.mechanism && {
      type: exception.mechanism.type,
      handled: exception.mechanism.handled,
    },
    stacktrace: frames && { frames: frames.map(scrubFrame) },
  };
}

function scrubContexts(contexts: ErrorEvent['contexts']): ErrorEvent['contexts'] {
  return {
    os: pickStrings(contexts?.os, ['name', 'version']),
    app: pickStrings(contexts?.app, ['app_version', 'app_build']),
    device: pickStrings(contexts?.device, ['model']),
  };
}

/**
 * Rebuilds an event from an allowlist of fields and scrubs every string in it, like the
 * desktop app. Anything not listed (user, request, extra, tags, server_name, modules,
 * debug_meta, attachments, fields a future SDK adds) is dropped.
 */
export function scrubEvent(event: ErrorEvent): ErrorEvent {
  const breadcrumbs = (event.breadcrumbs ?? [])
    .map(scrubBreadcrumb)
    .filter((crumb): crumb is Breadcrumb => crumb !== null);
  return {
    type: undefined,
    event_id: event.event_id,
    timestamp: event.timestamp,
    level: event.level,
    platform: event.platform,
    release: event.release,
    dist: event.dist,
    environment: event.environment,
    sdk: event.sdk && { name: event.sdk.name, version: event.sdk.version },
    message: event.message && scrubText(event.message),
    exception: event.exception?.values && {
      values: event.exception.values.map(scrubException),
    },
    contexts: scrubContexts(event.contexts),
    breadcrumbs,
    fingerprint: event.fingerprint?.map(scrubText),
  };
}
