/**
 * Releases a new version: preflight checks, `npm version`, push.
 * Ported from the desktop app's scripts/bump-version.js, same CLI.
 *
 * The bump, commit and tag are npm's own (`npm version` also runs the
 * `version` hook, scripts/sync-release-files.js, which stamps the codename and
 * app.json expo.version). This script adds the guards around them, and undoes
 * a local release if anything fails before the push lands.
 *
 * Unlike desktop, it resolves the target version itself first, so it can
 * refuse a version that is not newer, validate every file before anything is
 * written, and preview the change with --dry-run.
 *
 * @example
 * node scripts/bump-version.js patch my-codename
 * node scripts/bump-version.js preminor my-codename --preid=beta
 * node scripts/bump-version.js 1.4.0 my-codename --dry-run
 */
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { resolveTargetVersion } = require('./semver');
const {
  APP_JSON,
  PACKAGE_JSON,
  formatChanges,
  planReleaseChanges,
  readCurrentVersion,
  readReleaseFiles,
} = require('./release-files');

const ROOT = path.resolve(__dirname, '..');
const RELEASE_BRANCH = 'main';
const TAG_PREFIX = 'v';
const CODENAME_PATTERN = /^[A-Za-z0-9._-]+$/;
// Files npm and the version hook write; restored if the release fails before committing.
const RELEASE_FILES = [PACKAGE_JSON, 'package-lock.json', APP_JSON];

const USAGE = [
  'Usage: node scripts/bump-version.js <bump-type> <codename> [--preid=<id>] [--dry-run] [npm-version-flags]',
  '  bump-type: major | minor | patch | premajor | preminor | prepatch |',
  '             prerelease | an explicit version such as 1.4.0',
  '  --dry-run: print the version change per file, write nothing',
  '  example:   node scripts/bump-version.js preminor my-codename --preid=beta',
  '',
  `Updates ${PACKAGE_JSON}, package-lock.json and ${APP_JSON} (expo.version, without a`,
  'prerelease suffix), commits "chore: release version <version>-<codename>",',
  `tags ${TAG_PREFIX}<version> and pushes both to origin/${RELEASE_BRANCH}.`,
  'The pushed tag starts the release workflow, which builds the signed APK into a',
  'draft GitHub Release. android.versionCode is derived from the version at',
  'prebuild time (plugins/android-version.js, D-85); nothing stores it.',
].join('\n');

/**
 * @typedef {Object} ReleaseArgs
 * @property {boolean} isHelp - `--help` / `-h` was given.
 * @property {boolean} isDryRun - `--dry-run` was given.
 * @property {string} [bumpType] - Release keyword or explicit version.
 * @property {string} [codename] - Release codename.
 * @property {string} [preid] - Prerelease identifier from `--preid`.
 * @property {string[]} passthrough - Other flags, forwarded to `npm version`.
 */

/**
 * Parses the command line.
 * @param {string[]} argv - Arguments after the script path.
 * @returns {ReleaseArgs} The parsed arguments.
 * @throws {Error} On missing, stray or invalid arguments.
 */
function parseArgs(argv) {
  const args = { isHelp: false, isDryRun: false, passthrough: [] };
  const positionals = [];
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') args.isHelp = true;
    else if (arg === '--dry-run') args.isDryRun = true;
    else if (arg.startsWith('--preid=')) args.preid = arg.slice('--preid='.length);
    else if (arg === '--preid') args.preid = argv[++i];
    else if (arg.startsWith('-')) args.passthrough.push(arg);
    else positionals.push(arg);
  }
  if (args.isHelp) return args;

  const [bumpType, codename, stray] = positionals;
  if (!bumpType || !codename) throw new Error('Missing <bump-type> or <codename>.');
  // The old desktop script took a prerelease tag as a third positional; catch
  // the muscle-memory form rather than forwarding it.
  if (stray) {
    throw new Error(
      `Unexpected argument ${JSON.stringify(stray)}. Prereleases take --preid instead, ` +
        `e.g.: prepatch ${codename} --preid=${stray.replace(/\..*$/, '')}`,
    );
  }
  // The codename is interpolated into npm's -m, where %s expands to the version.
  if (!CODENAME_PATTERN.test(codename)) {
    throw new Error(
      `Invalid codename ${JSON.stringify(codename)}. Use letters, digits, dot, dash or underscore only.`,
    );
  }
  return { ...args, bumpType, codename };
}

/**
 * Runs a git command and returns its trimmed stdout.
 * @param {string[]} args - Arguments to pass to git.
 * @returns {string} The trimmed stdout.
 */
function git(args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
}

/**
 * Runs a git command and reports whether it exited zero.
 * @param {string[]} args - Arguments to pass to git.
 * @returns {boolean} True when the command succeeded.
 */
function gitOk(args) {
  try {
    execFileSync('git', args, { cwd: ROOT, stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Runs a command with inherited stdio, throwing if it fails.
 * @param {string} cmd - The command to run.
 * @param {string[]} args - Arguments to pass to the command.
 * @param {Object} [env] - Extra environment variables.
 * @returns {void}
 */
function run(cmd, args, env) {
  console.log(`> ${cmd} ${args.join(' ')}`);
  execFileSync(cmd, args, { cwd: ROOT, stdio: 'inherit', env: { ...process.env, ...env } });
}

/**
 * Prints a message and exits with a failure code.
 * @param {...string} lines - Lines to print to stderr.
 * @returns {never}
 */
function die(...lines) {
  console.error(lines.join('\n'));
  process.exit(1);
}

/**
 * Undoes a release that was committed locally but never pushed.
 *
 * Decides by comparing HEAD against the SHA captured before the release began:
 * a failure before any commit only restores the release files (the tree was
 * verified clean, so nothing else is lost), and a commit the remote already
 * accepted must not be reset.
 *
 * @param {string} reason - What failed, printed first.
 * @param {string} preRunHead - HEAD as it was before `npm version` ran.
 * @returns {never}
 */
function rollback(reason, preRunHead) {
  const now = git(['rev-parse', 'HEAD']);

  console.error(`\n${reason}`);

  if (now === preRunHead) {
    git(['checkout', '--', ...RELEASE_FILES]);
    die(`HEAD unchanged (${now}) - restored ${RELEASE_FILES.join(', ')}.`);
  }

  if (gitOk(['merge-base', '--is-ancestor', now, `origin/${RELEASE_BRANCH}`])) {
    die(
      `commit ${now} is already on origin/${RELEASE_BRANCH} - NOT resetting.`,
      'The release landed remotely; reconcile manually before retrying.',
    );
  }

  for (const tag of git(['tag', '--points-at', now]).split('\n').filter(Boolean)) {
    git(['tag', '-d', tag]);
  }
  git(['reset', '--hard', preRunHead]);

  die(
    `rolled back: HEAD ${now} -> ${git(['rev-parse', 'HEAD'])}`,
    `             (expected ${preRunHead})`,
  );
}

/**
 * Resolves the target version and validates every release file. Writes nothing.
 * @param {ReleaseArgs} args - Parsed arguments.
 * @returns {{current: string, version: string, changes: import('./release-files').FileChange[]}}
 * @throws {Error} When the version or any file is invalid.
 */
function planRelease({ bumpType, codename, preid }) {
  const files = readReleaseFiles(ROOT);
  const current = readCurrentVersion(files);
  const version = resolveTargetVersion(current, bumpType, preid);
  return { current, version, changes: planReleaseChanges(files, { version, codename }) };
}

/**
 * Refuses to release off main, with local changes, or behind origin.
 * @returns {void}
 */
function preflight() {
  const branch = git(['rev-parse', '--abbrev-ref', 'HEAD']);
  if (branch !== RELEASE_BRANCH) {
    die(
      `Refusing to release from "${branch}".`,
      `Releases must run on ${RELEASE_BRANCH}; nothing was changed.`,
    );
  }

  // npm version refuses a dirty tree too; checking first also makes rollback's
  // restore of the release files safe.
  if (git(['status', '--porcelain', '--untracked-files=no'])) {
    die('Working tree has uncommitted changes; commit or stash them first.');
  }

  git(['fetch', 'origin', '--tags']);

  const behind = git(['rev-list', '--count', `${RELEASE_BRANCH}..origin/${RELEASE_BRANCH}`]);
  if (behind !== '0') {
    die(
      `origin/${RELEASE_BRANCH} is ${behind} commit(s) ahead of yours.`,
      `Run: git pull --rebase origin ${RELEASE_BRANCH}`,
    );
  }
}

/**
 * Main execution flow for the release script.
 * @returns {void}
 */
function main() {
  let args;
  let plan;
  try {
    args = parseArgs(process.argv.slice(2));
    if (args.isHelp) {
      console.log(USAGE);
      return;
    }
    plan = planRelease(args);
  } catch (error) {
    die(error.message, '', USAGE);
  }

  const { codename } = args;
  const message = `chore: release version %s-${codename}`;
  if (args.isDryRun) {
    console.log(
      `Dry run: ${plan.current} -> ${plan.version} (${codename}). Nothing was written.\n`,
    );
    console.log(formatChanges(plan.changes));
    console.log(
      `\nWould commit "${message.replace('%s', plan.version)}", tag ${TAG_PREFIX}${plan.version}` +
        ` and push both to origin/${RELEASE_BRANCH}.`,
    );
    return;
  }

  preflight();

  const preRunHead = git(['rev-parse', 'HEAD']);
  console.log(
    `Releasing ${plan.current} -> ${plan.version} from ${preRunHead} on ${RELEASE_BRANCH}`,
  );

  try {
    run(
      'npm',
      [
        'version',
        plan.version,
        ...args.passthrough,
        `--tag-version-prefix=${TAG_PREFIX}`,
        '-m',
        message,
      ],
      { CMU_CODENAME: codename },
    );
  } catch {
    rollback('npm version failed.', preRunHead);
  }

  try {
    run('git', ['push', '--atomic', 'origin', RELEASE_BRANCH, '--follow-tags']);
  } catch {
    rollback(
      `Push to origin/${RELEASE_BRANCH} failed (remote moved, or the tag exists there).`,
      preRunHead,
    );
  }

  console.log(`\nReleased ${TAG_PREFIX}${plan.version} (${codename})`);
}

if (require.main === module) main();

module.exports = { parseArgs };
