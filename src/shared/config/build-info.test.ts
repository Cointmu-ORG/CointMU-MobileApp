import { formatBuildReport, parseBuildInfo } from './build-info';

const COMMIT = '0123456789abcdef0123456789abcdef01234567';
const GENERATED = {
  version: '1.1.0',
  codename: 'FelisCatus',
  commit: COMMIT,
  commitShort: '0123456',
  branch: 'main',
  dirty: false,
  builtAt: '2026-11-11T08:09:10.000Z',
  channel: 'ci',
  ciRun: '412',
};
const APP = { version: '1.1.0', codename: 'FelisCatus', build: null };

describe('parseBuildInfo', () => {
  it('reads a generated file', () => {
    expect(parseBuildInfo(GENERATED)).toEqual({
      commit: COMMIT,
      commitShort: '0123456',
      branch: 'main',
      isDirty: false,
      builtAt: '2026-11-11T08:09:10.000Z',
      channel: 'ci',
      ciRun: '412',
    });
  });

  it('reads a file generated without git', () => {
    const noGit = { ...GENERATED, commit: null, commitShort: null, branch: null, dirty: null };
    expect(parseBuildInfo(noGit)).toMatchObject({
      commit: null,
      commitShort: null,
      branch: null,
      isDirty: null,
    });
  });

  it.each([null, undefined, 'text', 7, [], {}])('falls back to dev values for %p', (raw) => {
    expect(parseBuildInfo(raw)).toEqual({
      commit: null,
      commitShort: null,
      branch: null,
      isDirty: null,
      builtAt: null,
      channel: 'dev',
      ciRun: null,
    });
  });

  it('drops single bad fields and keeps the rest', () => {
    const info = parseBuildInfo({
      ...GENERATED,
      commit: 'abc',
      builtAt: 'yesterday',
      channel: 'nightly',
    });
    expect(info).toMatchObject({ commit: null, commitShort: null, builtAt: null, channel: 'dev' });
    expect(info.branch).toBe('main');
  });
});

describe('formatBuildReport', () => {
  it('writes one plain line per fact', () => {
    const build = parseBuildInfo({ ...GENERATED, dirty: true });
    expect(formatBuildReport({ app: APP, build, platform: 'android 35' })).toBe(
      [
        'Muvo 1.1.0-FelisCatus (build development)',
        `Commit: ${COMMIT} (modified)`,
        'Branch: main',
        'Built: 2026-11-11T08:09:10.000Z',
        'Channel: ci',
        'CI run: 412',
        'Platform: android 35',
      ].join('\n'),
    );
  });

  it('says unknown where the build has no git data, and leaves out a missing CI run', () => {
    const report = formatBuildReport({
      app: { version: '1.1.0', codename: '', build: '42' },
      build: parseBuildInfo({}),
      platform: 'ios 18.1',
    });
    expect(report).toBe(
      [
        'Muvo 1.1.0 (build 42)',
        'Commit: unknown',
        'Branch: unknown',
        'Built: unknown',
        'Channel: dev',
        'Platform: ios 18.1',
      ].join('\n'),
    );
  });
});
