/**
 * Semantic Versioning 2.0.0 helpers for the release scripts: parse, compare,
 * increment. Node built-ins only, so the release flow needs no new dependency.
 *
 * Increments follow npm's (node-semver's `inc`) rules, so a keyword bump
 * resolves to the same version `npm version <keyword>` would pick.
 */

// semver.org's reference pattern without build metadata: npm drops build
// metadata from the version it writes, so it is rejected instead.
const SEMVER_PATTERN =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*))?$/;
const NUMERIC_IDENTIFIER = /^(0|[1-9]\d*)$/;
const PREID_PATTERN = /^[0-9A-Za-z-]+$/;
// npm accepts `v1.2.3` for an explicit version, as does the `v*` tag prefix.
const LEADING_V = /^v(?=\d)/;

const RELEASE_TYPES = ['major', 'minor', 'patch', 'premajor', 'preminor', 'prepatch', 'prerelease'];

/**
 * @typedef {Object} Version
 * @property {number} major
 * @property {number} minor
 * @property {number} patch
 * @property {(string|number)[]} prerelease - Numeric identifiers as numbers.
 */

/**
 * Parses a strict semver string (no build metadata).
 * @param {string} text - The version, e.g. `1.4.0` or `1.4.0-beta.2`.
 * @returns {Version} The parsed version.
 * @throws {Error} When the text is not a valid semver version.
 */
function parseVersion(text) {
  const match = SEMVER_PATTERN.exec(String(text));
  if (!match) {
    throw new Error(`${JSON.stringify(text)} is not a valid semver version (x.y.z[-pre])`);
  }
  const [, major, minor, patch, pre] = match;
  return {
    major: Number(major),
    minor: Number(minor),
    patch: Number(patch),
    prerelease: pre
      ? pre.split('.').map((id) => (NUMERIC_IDENTIFIER.test(id) ? Number(id) : id))
      : [],
  };
}

/**
 * Formats a parsed version back to a string.
 * @param {Version} version - The version to format.
 * @returns {string} The semver string.
 */
function formatVersion({ major, minor, patch, prerelease }) {
  const core = `${major}.${minor}.${patch}`;
  return prerelease.length ? `${core}-${prerelease.join('.')}` : core;
}

/**
 * Compares two prerelease identifiers by semver precedence.
 * @param {string|number} a - Left identifier.
 * @param {string|number} b - Right identifier.
 * @returns {number} Negative, zero or positive.
 */
function compareIdentifiers(a, b) {
  const aIsNumber = typeof a === 'number';
  const bIsNumber = typeof b === 'number';
  if (aIsNumber && bIsNumber) return a - b;
  // Numeric identifiers always have lower precedence than alphanumeric ones.
  if (aIsNumber !== bIsNumber) return aIsNumber ? -1 : 1;
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

/**
 * Compares two prerelease lists. An empty list (a release) ranks highest.
 * @param {(string|number)[]} a - Left prerelease identifiers.
 * @param {(string|number)[]} b - Right prerelease identifiers.
 * @returns {number} Negative, zero or positive.
 */
function comparePrerelease(a, b) {
  if (!a.length || !b.length) return b.length - a.length;
  for (let i = 0; i < Math.min(a.length, b.length); i += 1) {
    const order = compareIdentifiers(a[i], b[i]);
    if (order !== 0) return order;
  }
  return a.length - b.length;
}

/**
 * Compares two semver strings by precedence.
 * @param {string} left - Left version.
 * @param {string} right - Right version.
 * @returns {-1|0|1} -1 when left < right, 0 when equal, 1 when left > right.
 * @throws {Error} When either side is not valid semver.
 */
function compareVersions(left, right) {
  const a = parseVersion(left);
  const b = parseVersion(right);
  const order =
    a.major - b.major ||
    a.minor - b.minor ||
    a.patch - b.patch ||
    comparePrerelease(a.prerelease, b.prerelease);
  return Math.sign(order);
}

/**
 * Bumps a prerelease, the way node-semver's `inc('prerelease')` does.
 * @param {Version} version - The current version (copied, not mutated).
 * @param {string} [preid] - Prerelease identifier such as `beta`.
 * @returns {Version} The bumped version.
 */
function bumpPrerelease(version, preid) {
  if (!version.prerelease.length) {
    return { ...version, patch: version.patch + 1, prerelease: preid ? [preid, 0] : [0] };
  }
  // A different preid, or the same one without a counter after it, restarts at 0.
  const isPreidCounted =
    version.prerelease[0] === preid && typeof version.prerelease[1] === 'number';
  if (preid && !isPreidCounted) {
    return { ...version, prerelease: [preid, 0] };
  }
  const prerelease = [...version.prerelease];
  const last = prerelease.findLastIndex((id) => typeof id === 'number');
  if (last === -1) prerelease.push(0);
  else prerelease[last] += 1;
  return { ...version, prerelease };
}

/**
 * Applies a release keyword to a version.
 * @param {string} current - The current semver version.
 * @param {string} releaseType - One of RELEASE_TYPES.
 * @param {string} [preid] - Prerelease identifier for the `pre*` types.
 * @returns {string} The incremented version.
 * @throws {Error} On an unknown release type, invalid preid or invalid version.
 */
function incrementVersion(current, releaseType, preid) {
  if (preid !== undefined && !PREID_PATTERN.test(preid)) {
    throw new Error(`Invalid preid ${JSON.stringify(preid)}: use letters, digits or dash`);
  }
  const v = parseVersion(current);
  const isPre = v.prerelease.length > 0;
  const pre = preid ? [preid, 0] : [0];

  switch (releaseType) {
    case 'major':
      // 2.0.0-beta.1 -> 2.0.0: the prerelease was already of this major.
      if (isPre && v.minor === 0 && v.patch === 0) return formatVersion({ ...v, prerelease: [] });
      return formatVersion({ major: v.major + 1, minor: 0, patch: 0, prerelease: [] });
    case 'minor':
      if (isPre && v.patch === 0) return formatVersion({ ...v, prerelease: [] });
      return formatVersion({ ...v, minor: v.minor + 1, patch: 0, prerelease: [] });
    case 'patch':
      if (isPre) return formatVersion({ ...v, prerelease: [] });
      return formatVersion({ ...v, patch: v.patch + 1 });
    case 'premajor':
      return formatVersion({ major: v.major + 1, minor: 0, patch: 0, prerelease: pre });
    case 'preminor':
      return formatVersion({ ...v, minor: v.minor + 1, patch: 0, prerelease: pre });
    case 'prepatch':
      return formatVersion({ ...v, patch: v.patch + 1, prerelease: pre });
    case 'prerelease':
      return formatVersion(bumpPrerelease(v, preid));
    default:
      throw new Error(`Unknown release type ${JSON.stringify(releaseType)}`);
  }
}

/**
 * Resolves a bump argument (keyword or explicit version) to the next version,
 * refusing anything that is not strictly newer than the current one.
 * @param {string} current - The current semver version.
 * @param {string} bumpType - A release keyword or an explicit version.
 * @param {string} [preid] - Prerelease identifier for the `pre*` keywords.
 * @returns {string} The next version.
 * @throws {Error} When the result is invalid, equal to or older than current.
 */
function resolveTargetVersion(current, bumpType, preid) {
  parseVersion(current);
  const target = RELEASE_TYPES.includes(bumpType)
    ? incrementVersion(current, bumpType, preid)
    : formatVersion(parseVersion(bumpType.replace(LEADING_V, '')));

  const order = compareVersions(target, current);
  if (order === 0) {
    throw new Error(`${target} is already the current version`);
  }
  if (order < 0) {
    throw new Error(`${target} is older than the current version ${current}`);
  }
  return target;
}

module.exports = {
  RELEASE_TYPES,
  compareVersions,
  formatVersion,
  incrementVersion,
  parseVersion,
  resolveTargetVersion,
};
