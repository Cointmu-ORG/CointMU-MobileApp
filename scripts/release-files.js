/**
 * The files a release touches, and what changes in each. Shared by
 * bump-version.js (preflight check and --dry-run) and sync-release-files.js
 * (npm's `version` hook), so both read and validate the files the same way.
 *
 * - package.json        "version" (npm) and "codename" (hook)
 * - package-lock.json   root "version" and packages[""].version (npm)
 * - app.json            expo.version (hook), without a prerelease suffix
 *
 * Native build numbers (ios.buildNumber, android.versionCode) are not touched:
 * EAS remote versioning owns them (D-40).
 */
const fs = require('node:fs');
const path = require('node:path');

const PACKAGE_JSON = 'package.json';
const PACKAGE_LOCK = 'package-lock.json';
const APP_JSON = 'app.json';
// A dynamic config would take over from app.json; this script only edits app.json.
const DYNAMIC_CONFIGS = ['app.config.js', 'app.config.ts', 'app.config.mjs', 'app.config.cjs'];
const JSON_INDENT = 2;
const VERSION_ENTRY = /"version"(\s*:\s*)"([^"\\]*)"/g;
const NONE = '(none)';

/**
 * @typedef {Object} ReleaseFiles
 * @property {string} packageJson - Raw package.json text.
 * @property {string} packageLock - Raw package-lock.json text.
 * @property {string} appJson - Raw app.json text.
 */

/**
 * @typedef {Object} FileChange
 * @property {string} file - File name relative to the repo root.
 * @property {string} field - The field that changes.
 * @property {string} from - Current value, or `(none)`.
 * @property {string} to - New value.
 */

/**
 * Drops the prerelease suffix: iOS CFBundleShortVersionString (set from
 * expo.version) only takes period-separated integers. Mirrors the desktop
 * Makefile, which drops it too.
 * @param {string} version - A semver version.
 * @returns {string} `major.minor.patch`.
 */
function toStoreVersion(version) {
  return version.split('-')[0];
}

/**
 * Parses one file's JSON, naming the file when it fails.
 * @param {string} file - File name, for the error message.
 * @param {string} text - The file content.
 * @returns {Record<string, unknown>} The parsed object.
 * @throws {Error} When the content is not a JSON object.
 */
function parseJsonFile(file, text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new Error(`${file} is not valid JSON: ${error.message}`, { cause: error });
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`${file} does not hold a JSON object`);
  }
  return parsed;
}

/**
 * Sets package.json "codename", placed right after "version" when new.
 * Written the way npm writes package.json (2-space indent, trailing newline).
 * @param {string} text - package.json content.
 * @param {string} codename - The release codename.
 * @returns {string} The updated content.
 */
function stampCodename(text, codename) {
  const pkg = parseJsonFile(PACKAGE_JSON, text);
  const entries = Object.entries(pkg).filter(([key]) => key !== 'codename');
  const at = entries.findIndex(([key]) => key === 'version') + 1;
  entries.splice(at, 0, ['codename', codename]);
  return JSON.stringify(Object.fromEntries(entries), null, JSON_INDENT) + '\n';
}

/**
 * Sets app.json expo.version by editing that one string in place, so the
 * Prettier layout of the rest of the file (e.g. one-line plugin arrays) stays.
 * The edit is checked by re-parsing: nothing but expo.version may change.
 * @param {string} text - app.json content.
 * @param {string} version - The new semver version.
 * @returns {string} The updated content.
 * @throws {Error} When expo.version is missing or cannot be located.
 */
function updateAppJsonVersion(text, version) {
  const app = parseJsonFile(APP_JSON, text);
  const current = app.expo?.version;
  if (typeof current !== 'string') {
    throw new Error(`${APP_JSON} has no expo.version string`);
  }
  const next = toStoreVersion(version);
  if (current === next) return text;

  const expected = JSON.stringify({ ...app, expo: { ...app.expo, version: next } });
  for (const match of text.matchAll(VERSION_ENTRY)) {
    if (match[2] !== current) continue;
    const candidate =
      text.slice(0, match.index) +
      `"version"${match[1]}"${next}"` +
      text.slice(match.index + match[0].length);
    if (JSON.stringify(JSON.parse(candidate)) === expected) return candidate;
  }
  throw new Error(`Could not locate expo.version in ${APP_JSON}`);
}

/**
 * Reads the release files from a repo root.
 * @param {string} root - Repo root.
 * @returns {ReleaseFiles} Their raw contents.
 * @throws {Error} When a dynamic app config exists or a file cannot be read.
 */
function readReleaseFiles(root) {
  const dynamic = DYNAMIC_CONFIGS.find((file) => fs.existsSync(path.join(root, file)));
  if (dynamic) {
    throw new Error(
      `Found ${dynamic}: the app version may no longer come from ${APP_JSON}. ` +
        'Update scripts/release-files.js before releasing.',
    );
  }
  const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
  return {
    packageJson: read(PACKAGE_JSON),
    packageLock: read(PACKAGE_LOCK),
    appJson: read(APP_JSON),
  };
}

/**
 * Reads the current version from package.json.
 * @param {ReleaseFiles} files - Raw file contents.
 * @returns {string} The "version" value.
 * @throws {Error} When package.json is invalid or has no version string.
 */
function readCurrentVersion(files) {
  const { version } = parseJsonFile(PACKAGE_JSON, files.packageJson);
  if (typeof version !== 'string') {
    throw new Error(`${PACKAGE_JSON} has no "version" string`);
  }
  return version;
}

/**
 * Lists every change a release makes, validating all files first. Nothing is
 * written; a parse failure in any file throws before the caller writes.
 * @param {ReleaseFiles} files - Raw file contents.
 * @param {{version: string, codename: string}} release - Target version and codename.
 * @returns {FileChange[]} One entry per field, including unchanged ones.
 * @throws {Error} When a file is invalid or a version field is missing.
 */
function planReleaseChanges(files, { version, codename }) {
  const pkg = parseJsonFile(PACKAGE_JSON, files.packageJson);
  const lock = parseJsonFile(PACKAGE_LOCK, files.packageLock);
  const app = parseJsonFile(APP_JSON, files.appJson);
  const lockRootVersion = lock.packages?.['']?.version;
  if (typeof lock.version !== 'string' || typeof lockRootVersion !== 'string') {
    throw new Error(`${PACKAGE_LOCK} has no root version fields`);
  }
  // Throws early if app.json's version cannot be edited in place.
  updateAppJsonVersion(files.appJson, version);

  return [
    { file: PACKAGE_JSON, field: 'version', from: pkg.version ?? NONE, to: version },
    { file: PACKAGE_JSON, field: 'codename', from: pkg.codename ?? NONE, to: codename },
    { file: PACKAGE_LOCK, field: 'version', from: lock.version, to: version },
    { file: PACKAGE_LOCK, field: 'packages[""].version', from: lockRootVersion, to: version },
    { file: APP_JSON, field: 'expo.version', from: app.expo.version, to: toStoreVersion(version) },
  ];
}

/**
 * Renders planned changes as aligned `file  field  from -> to` lines.
 * @param {FileChange[]} changes - The planned changes.
 * @returns {string} One line per change.
 */
function formatChanges(changes) {
  const fileWidth = Math.max(...changes.map((c) => c.file.length));
  const fieldWidth = Math.max(...changes.map((c) => c.field.length));
  return changes
    .map(({ file, field, from, to }) => {
      const diff = from === to ? `${to} (unchanged)` : `${from} -> ${to}`;
      return `  ${file.padEnd(fileWidth)}  ${field.padEnd(fieldWidth)}  ${diff}`;
    })
    .join('\n');
}

module.exports = {
  APP_JSON,
  PACKAGE_JSON,
  formatChanges,
  planReleaseChanges,
  readCurrentVersion,
  readReleaseFiles,
  stampCodename,
  toStoreVersion,
  updateAppJsonVersion,
};
