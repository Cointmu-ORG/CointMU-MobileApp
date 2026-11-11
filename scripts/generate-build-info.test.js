const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { collectBuildInfo, writeBuildInfo } = require('./generate-build-info');

const COMMIT = '0123456789abcdef0123456789abcdef01234567';
const OTHER_COMMIT = 'fedcba9876543210fedcba9876543210fedcba98';
const NOW = new Date('2026-11-11T08:09:10.000Z');
const PKG = { version: '1.1.0', codename: 'FelisCatus' };
const FIELDS = [
  'version',
  'codename',
  'commit',
  'commitShort',
  'branch',
  'dirty',
  'builtAt',
  'channel',
  'ciRun',
];

/**
 * A git runner answering from fixture data instead of a repository.
 * @param {{commit?: string, branch?: string, status?: string}} repo - Fixture answers.
 * @returns {(args: string[]) => string | null} The runner.
 */
function fixtureGit({ commit = COMMIT, branch = 'feat/thing', status = '' } = {}) {
  const answers = {
    'rev-parse HEAD': commit,
    'rev-parse --abbrev-ref HEAD': branch,
    'status --porcelain': status,
  };
  return (args) => answers[args.join(' ')] ?? null;
}

const noGit = () => null;

/**
 * Runs git quietly in a temp repo, with a fixed identity and no user config.
 * @param {string} cwd - The folder to run in.
 * @param {string[]} args - Git arguments.
 * @returns {string} Trimmed stdout.
 */
function git(cwd, args) {
  const identity = ['-c', 'user.name=Test', '-c', 'user.email=test@example.invalid'];
  const quiet = ['-c', 'commit.gpgsign=false', '-c', 'init.defaultBranch=main'];
  return execFileSync('git', [...identity, ...quiet, ...args], { cwd, encoding: 'utf8' }).trim();
}

const tempDirs = [];
afterEach(() => {
  tempDirs.splice(0).forEach((dir) => fs.rmSync(dir, { recursive: true, force: true }));
});

/**
 * @returns {string} A fresh temp dir outside any repository, removed after the test.
 */
function makeTempDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'muvo-build-info-'));
  tempDirs.push(dir);
  return dir;
}

/**
 * A repo with package.json, build-info.json ignored, and two commits.
 * @returns {string} The repo folder.
 */
function makeRepo() {
  const dir = makeTempDir();
  git(dir, ['init', '--quiet']);
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify(PKG));
  fs.writeFileSync(path.join(dir, '.gitignore'), 'build-info.json\n');
  git(dir, ['add', '.']);
  git(dir, ['commit', '--quiet', '-m', 'first']);
  git(dir, ['commit', '--quiet', '--allow-empty', '-m', 'second']);
  return dir;
}

describe('collectBuildInfo', () => {
  it('reads version, commit, branch and a clean tree from git', () => {
    const info = collectBuildInfo({ pkg: PKG, env: {}, now: NOW, git: fixtureGit() });
    expect(info).toEqual({
      version: '1.1.0',
      codename: 'FelisCatus',
      commit: COMMIT,
      commitShort: '0123456',
      branch: 'feat/thing',
      dirty: false,
      builtAt: '2026-11-11T08:09:10.000Z',
      channel: 'dev',
      ciRun: null,
    });
  });

  it('flags uncommitted changes', () => {
    const git = fixtureGit({ status: ' M src/app.ts' });
    expect(collectBuildInfo({ pkg: PKG, env: {}, now: NOW, git }).dirty).toBe(true);
  });

  it('still produces every field without git', () => {
    const info = collectBuildInfo({ pkg: { version: '1.1.0' }, env: {}, now: NOW, git: noGit });
    expect(Object.keys(info)).toEqual(FIELDS);
    expect(info).toMatchObject({
      version: '1.1.0',
      codename: '',
      commit: null,
      commitShort: null,
      branch: null,
      dirty: null,
      channel: 'dev',
    });
  });

  it('marks a CI build and takes the branch and run number from the environment', () => {
    // CI checks out a detached HEAD, so git itself has no branch name.
    const git = fixtureGit({ branch: 'HEAD' });
    const env = { CI: 'true', GITHUB_HEAD_REF: 'fix/a-branch', GITHUB_RUN_NUMBER: '412' };
    expect(collectBuildInfo({ pkg: PKG, env, now: NOW, git })).toMatchObject({
      channel: 'ci',
      branch: 'fix/a-branch',
      ciRun: '412',
    });
    expect(collectBuildInfo({ pkg: PKG, env: {}, now: NOW, git }).branch).toBeNull();
  });

  it('falls back to the commit the build service names when there is no git', () => {
    const env = { CI: 'true', GITHUB_SHA: OTHER_COMMIT, GITHUB_REF_NAME: 'main' };
    expect(collectBuildInfo({ pkg: PKG, env, now: NOW, git: noGit })).toMatchObject({
      commit: OTHER_COMMIT,
      commitShort: 'fedcba9',
      branch: 'main',
      dirty: null,
    });
  });

  it('ignores a commit that is not a full hash', () => {
    const env = { GITHUB_SHA: 'not-a-hash; rm -rf /' };
    expect(collectBuildInfo({ pkg: PKG, env, now: NOW, git: noGit }).commit).toBeNull();
  });

  it('picks the channel: explicit, then release service, then CI, then dev', () => {
    const channel = (env) => collectBuildInfo({ pkg: PKG, env, now: NOW, git: noGit }).channel;
    expect(channel({ BUILD_CHANNEL: 'release', CI: 'true' })).toBe('release');
    expect(channel({ EAS_BUILD: 'true', CI: 'true' })).toBe('release');
    expect(channel({ CI: 'true' })).toBe('ci');
    expect(channel({ BUILD_CHANNEL: 'nonsense' })).toBe('dev');
  });

  it('holds nothing about the machine, the user or the folder', () => {
    const env = { USER: 'someone', HOME: '/home/someone', HOSTNAME: 'laptop', PWD: '/work/muvo' };
    const text = JSON.stringify(collectBuildInfo({ pkg: PKG, env, now: NOW, git: fixtureGit() }));
    expect(text).not.toMatch(/someone|laptop|\/work|\/home/);
  });
});

describe('writeBuildInfo', () => {
  it('writes the real commit of a repository and does not dirty it', () => {
    const repo = makeRepo();
    const info = writeBuildInfo(repo, { env: {}, now: NOW });

    expect(info.commit).toBe(git(repo, ['rev-parse', 'HEAD']));
    expect(info.branch).toBe('main');
    expect(info.dirty).toBe(false);
    expect(JSON.parse(fs.readFileSync(path.join(repo, 'build-info.json'), 'utf8'))).toEqual(info);
    expect(git(repo, ['status', '--porcelain'])).toBe('');
  });

  it('works in a shallow clone', () => {
    const origin = makeRepo();
    const clone = makeTempDir();
    git(clone, ['clone', '--quiet', '--depth', '1', `file://${origin}`, '.']);
    expect(git(clone, ['rev-list', '--count', 'HEAD'])).toBe('1');

    const info = writeBuildInfo(clone, { env: {}, now: NOW });
    expect(info.commit).toBe(git(origin, ['rev-parse', 'HEAD']));
    expect(info.dirty).toBe(false);
  });

  it('writes null git fields in a folder that is not a repository', () => {
    const dir = makeTempDir();
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify(PKG));

    expect(writeBuildInfo(dir, { env: {}, now: NOW })).toMatchObject({
      commit: null,
      branch: null,
      dirty: null,
    });
  });

  it('writes null git fields when the git binary is missing', () => {
    const repo = makeRepo();
    const info = writeBuildInfo(repo, { env: {}, now: NOW, gitBinary: 'git-is-not-installed' });

    expect(info).toMatchObject({ version: '1.1.0', commit: null, branch: null, dirty: null });
    expect(fs.existsSync(path.join(repo, 'build-info.json'))).toBe(true);
  });
});
