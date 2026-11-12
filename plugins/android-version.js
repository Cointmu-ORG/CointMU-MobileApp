/**
 * Expo config plugin: Android versionCode and versionName from package.json (D-85).
 *
 * versionCode = major * 1_000_000 + minor * 1_000 + patch, from the semver core only, so a
 * prerelease or codename suffix never changes it. versionName is the full package.json version.
 * app.json stays static, which keeps scripts/bump-version.js (D-40) working unchanged.
 */
const { withAppBuildGradle } = require('expo/config-plugins');

const MAJOR_FACTOR = 1_000_000;
const MINOR_FACTOR = 1_000;
// minor and patch each get three digits; a larger one would collide with the next field.
const FIELD_LIMIT = 1_000;
// Google Play's upper bound for versionCode.
const MAX_VERSION_CODE = 2_100_000_000;
const SEMVER_CORE = /^(\d+)\.(\d+)\.(\d+)(?:-|$)/;
const VERSION_NAME_LINE = /versionName\s+"[^"]*"/;

/**
 * Derives the Android versionCode from a semver version.
 * @param {string} version - e.g. `1.1.0`, `1.2.0-beta.1`, `1.1.0-FelisCatus`.
 * @returns {number} The versionCode.
 * @throws {Error} When the version is not semver or a field is out of range.
 */
function toVersionCode(version) {
  const match = SEMVER_CORE.exec(version);
  if (!match) throw new Error(`Cannot derive versionCode: "${version}" is not a semver version.`);
  const [major, minor, patch] = match.slice(1).map(Number);
  const code = major * MAJOR_FACTOR + minor * MINOR_FACTOR + patch;
  if (minor >= FIELD_LIMIT || patch >= FIELD_LIMIT || code > MAX_VERSION_CODE) {
    throw new Error(`Cannot derive versionCode: "${version}" has a field out of range.`);
  }
  return code;
}

/**
 * Replaces the versionName Expo wrote (expo.version, without a prerelease suffix).
 * @param {string} gradle - android/app/build.gradle content.
 * @param {string} version - The full package.json version.
 * @returns {string} The updated content.
 * @throws {Error} When the file has no versionName line.
 */
function setVersionName(gradle, version) {
  if (!VERSION_NAME_LINE.test(gradle)) {
    throw new Error('android-version: no versionName line in android/app/build.gradle.');
  }
  return gradle.replace(VERSION_NAME_LINE, `versionName ${JSON.stringify(version)}`);
}

function withAndroidVersion(config) {
  const { version } = require('../package.json');
  // Expo's own version mod reads this when it writes build.gradle.
  config.android = { ...config.android, versionCode: toVersionCode(version) };
  // Mods added earlier run later, so this sees the versionName Expo already wrote.
  return withAppBuildGradle(config, (gradleConfig) => {
    gradleConfig.modResults.contents = setVersionName(gradleConfig.modResults.contents, version);
    return gradleConfig;
  });
}

module.exports = withAndroidVersion;
module.exports.toVersionCode = toVersionCode;
module.exports.setVersionName = setVersionName;
