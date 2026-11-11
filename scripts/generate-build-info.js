/**
 * Writes build-info.json: which commit and which kind of build a bundle came
 * from, for Settings > About and bug reports (D-72). The desktop app does the
 * same with update-build.js (a `prebuild` step writing an untracked
 * build-info.json that About reads); mobile records the commit instead of a
 * random build id.
 *
 * Runs from npm hooks (prepare, prestart, pretest, pretypecheck, ...) and in
 * CI before `expo export`, so the file is always there and always current. It
 * is untracked: writing it never dirties the tree.
 *
 * It must never fail a build: without git (a tarball, a missing binary) the git
 * fields are null. It only needs HEAD, so a shallow clone is enough. It writes
 * no secrets, paths, user names or machine names.
 *
 * node scripts/generate-build-info.js
 */
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const BUILD_INFO_JSON = 'build-info.json';
const CHANNELS = ['dev', 'ci', 'release'];
const FULL_HASH = /^[0-9a-f]{40}$/;
const SHORT_HASH_LENGTH = 7;
const GIT_TIMEOUT_MS = 5_000;
const JSON_INDENT = 2;
// What `git rev-parse --abbrev-ref HEAD` prints on a detached HEAD (CI checkouts).
const DETACHED_HEAD = 'HEAD';

/**
 * @typedef {Object} BuildInfo
 * @property {string} version - Release version from package.json.
 * @property {string} codename - Release codename from package.json, or ''.
 * @property {string | null} commit - Full commit hash; null without git.
 * @property {string | null} commitShort - First 7 characters of the hash.
 * @property {string | null} branch - Branch name; null when unknown.
 * @property {boolean | null} dirty - Uncommitted changes at build time; null without git.
 * @property {string} builtAt - Build time, ISO 8601 in UTC.
 * @property {'dev' | 'ci' | 'release'} channel - What kind of build this is.
 * @property {string | null} ciRun - CI run number, when built in CI.
 */

/**
 * @callback GitRunner
 * @param {string[]} args - Arguments for one read-only git command.
 * @returns {string | null} Trimmed stdout, or null when git fails or is missing.
 */

/**
 * Makes a runner for read-only git commands in one folder.
 * @param {string} cwd - The folder to run git in.
 * @param {string} [gitBinary] - The git executable; overridable for tests.
 * @returns {GitRunner} A runner that never throws.
 */
function createGitRunner(cwd, gitBinary = 'git') {
  return (args) => {
    try {
      const stdout = execFileSync(gitBinary, args, {
        cwd,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
        timeout: GIT_TIMEOUT_MS,
      });
      return stdout.trim();
    } catch {
      // No git binary, not a repository, or no commit yet: the fields stay null.
      return null;
    }
  };
}

/**
 * An explicit BUILD_CHANNEL wins; then a release build service (EAS); then CI.
 * @param {Record<string, string | undefined>} env - Process environment.
 * @returns {'dev' | 'ci' | 'release'} The build channel.
 */
function resolveChannel(env) {
  if (CHANNELS.includes(env.BUILD_CHANNEL)) return env.BUILD_CHANNEL;
  if (env.EAS_BUILD === 'true') return 'release';
  return env.CI ? 'ci' : 'dev';
}

/**
 * The commit from git, else from the build service (its checkout may have no .git).
 * @param {GitRunner} git - Git runner.
 * @param {Record<string, string | undefined>} env - Process environment.
 * @returns {string | null} A full lowercase hash, or null.
 */
function resolveCommit(git, env) {
  const candidates = [git(['rev-parse', 'HEAD']), env.GITHUB_SHA, env.EAS_BUILD_GIT_COMMIT_HASH];
  return candidates.find((value) => typeof value === 'string' && FULL_HASH.test(value)) ?? null;
}

/**
 * CI checks out a detached HEAD, so its branch comes from the environment.
 * @param {GitRunner} git - Git runner.
 * @param {Record<string, string | undefined>} env - Process environment.
 * @returns {string | null} The branch name, or null.
 */
function resolveBranch(git, env) {
  const fromCi = env.GITHUB_HEAD_REF || env.GITHUB_REF_NAME;
  if (fromCi) return fromCi;
  const fromGit = git(['rev-parse', '--abbrev-ref', 'HEAD']);
  return fromGit && fromGit !== DETACHED_HEAD ? fromGit : null;
}

/**
 * Collects the build info. Pure apart from the injected git runner.
 * @param {Object} input
 * @param {{version?: unknown, codename?: unknown}} input.pkg - Parsed package.json.
 * @param {Record<string, string | undefined>} input.env - Process environment.
 * @param {Date} input.now - Build time.
 * @param {GitRunner} input.git - Git runner.
 * @returns {BuildInfo} The build info.
 */
function collectBuildInfo({ pkg, env, now, git }) {
  const commit = resolveCommit(git, env);
  const status = git(['status', '--porcelain']);
  return {
    version: String(pkg.version),
    codename: typeof pkg.codename === 'string' ? pkg.codename : '',
    commit,
    commitShort: commit ? commit.slice(0, SHORT_HASH_LENGTH) : null,
    branch: resolveBranch(git, env),
    dirty: status === null ? null : status !== '',
    builtAt: now.toISOString(),
    channel: resolveChannel(env),
    ciRun: env.GITHUB_RUN_NUMBER || null,
  };
}

/**
 * Collects the build info for a project folder and writes its build-info.json.
 * @param {string} root - Folder holding package.json (and usually .git).
 * @param {Object} [options]
 * @param {Record<string, string | undefined>} [options.env] - Environment.
 * @param {Date} [options.now] - Build time.
 * @param {string} [options.gitBinary] - The git executable.
 * @returns {BuildInfo} What was written.
 */
function writeBuildInfo(root, { env = process.env, now = new Date(), gitBinary } = {}) {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const info = collectBuildInfo({ pkg, env, now, git: createGitRunner(root, gitBinary) });
  fs.writeFileSync(
    path.join(root, BUILD_INFO_JSON),
    `${JSON.stringify(info, null, JSON_INDENT)}\n`,
  );
  return info;
}

if (require.main === module) {
  const info = writeBuildInfo(ROOT);
  const state = info.dirty ? ', modified' : '';
  console.log(`build-info: ${info.commitShort ?? 'no commit'} (${info.channel}${state})`);
}

module.exports = { collectBuildInfo, createGitRunner, writeBuildInfo };
