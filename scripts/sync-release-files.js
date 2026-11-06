/**
 * npm's `version` lifecycle hook: stamps the release into the files npm does
 * not manage, then stages them so they land in npm's own release commit.
 *
 * Runs after npm has written the new version and before it stages
 * package.json, so the codename needs no second commit or amend.
 *
 * - package.json "codename", from CMU_CODENAME
 * - app.json expo.version (prerelease suffix dropped, see release-files.js)
 *
 * Both files are computed before either is written.
 */
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const {
  APP_JSON,
  PACKAGE_JSON,
  readCurrentVersion,
  readReleaseFiles,
  stampCodename,
  updateAppJsonVersion,
} = require('./release-files');

const ROOT = path.resolve(__dirname, '..');

/**
 * Hook entry point.
 * @returns {void}
 */
function main() {
  const codename = process.env.CMU_CODENAME;
  if (!codename) {
    console.error('sync-release-files: CMU_CODENAME is not set');
    process.exit(1);
  }

  const files = readReleaseFiles(ROOT);
  const version = readCurrentVersion(files);
  const packageJson = stampCodename(files.packageJson, codename);
  const appJson = updateAppJsonVersion(files.appJson, version);

  fs.writeFileSync(path.join(ROOT, PACKAGE_JSON), packageJson);
  fs.writeFileSync(path.join(ROOT, APP_JSON), appJson);

  execFileSync('git', ['add', APP_JSON], { cwd: ROOT, stdio: 'inherit' });
}

if (require.main === module) main();
