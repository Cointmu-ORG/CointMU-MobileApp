/**
 * Expo config plugin: release signing for the generated Android project (D-86).
 *
 * When the four signing variables are set at prebuild time, android/app/build.gradle gets a
 * release signingConfig that reads them from the environment when Gradle runs. Only the variable
 * names are written, never a value, so the generated files hold no secret and
 * `expo prebuild --clean` stays reproducible. With none of them set the template is left alone
 * (release is signed with the debug key: a test build that cannot update a real install).
 */
const { withAppBuildGradle } = require('expo/config-plugins');

const SIGNING_ENV = [
  'ANDROID_KEYSTORE_PATH',
  'ANDROID_KEYSTORE_PASSWORD',
  'ANDROID_KEY_ALIAS',
  'ANDROID_KEY_PASSWORD',
];

const SIGNING_CONFIGS_OPEN = /signingConfigs\s*\{\n/;
// The release build type of the template: comments, then the debug signing line.
const RELEASE_USES_DEBUG_KEY =
  /(release\s*\{\n(?:\s*\/\/[^\n]*\n)*\s*)signingConfig signingConfigs\.debug/;
const RELEASE_SIGNING_CONFIG = `        release {
            storeFile file(System.getenv('ANDROID_KEYSTORE_PATH'))
            storePassword System.getenv('ANDROID_KEYSTORE_PASSWORD')
            keyAlias System.getenv('ANDROID_KEY_ALIAS')
            keyPassword System.getenv('ANDROID_KEY_PASSWORD')
        }
`;

/**
 * Decides whether to wire release signing.
 * @param {Record<string, string | undefined>} env - Process environment.
 * @returns {boolean} True when all four variables are set, false when none is.
 * @throws {Error} When only some are set, naming the missing ones (never a value).
 */
function hasSigningEnv(env) {
  const missing = SIGNING_ENV.filter((name) => !env[name]);
  if (missing.length === SIGNING_ENV.length) return false;
  if (missing.length > 0) {
    throw new Error(`android-signing: incomplete signing config, missing ${missing.join(', ')}.`);
  }
  return true;
}

/**
 * Adds the release signingConfig and makes the release build type use it.
 * @param {string} gradle - android/app/build.gradle content.
 * @returns {string} The updated content.
 * @throws {Error} When the template no longer has the expected blocks.
 */
function addReleaseSigning(gradle) {
  if (!SIGNING_CONFIGS_OPEN.test(gradle) || !RELEASE_USES_DEBUG_KEY.test(gradle)) {
    throw new Error(
      'android-signing: android/app/build.gradle does not match the Expo template; ' +
        'update plugins/android-signing.js.',
    );
  }
  return gradle
    .replace(RELEASE_USES_DEBUG_KEY, '$1signingConfig signingConfigs.release')
    .replace(SIGNING_CONFIGS_OPEN, (open) => open + RELEASE_SIGNING_CONFIG);
}

function withAndroidSigning(config) {
  return withAppBuildGradle(config, (gradleConfig) => {
    if (hasSigningEnv(process.env)) {
      gradleConfig.modResults.contents = addReleaseSigning(gradleConfig.modResults.contents);
    }
    return gradleConfig;
  });
}

module.exports = withAndroidSigning;
module.exports.addReleaseSigning = addReleaseSigning;
module.exports.hasSigningEnv = hasSigningEnv;
