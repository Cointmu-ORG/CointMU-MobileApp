const {
  compareVersions,
  incrementVersion,
  parseVersion,
  resolveTargetVersion,
} = require('./semver');

describe('parseVersion', () => {
  it('parses numeric and alphanumeric prerelease identifiers', () => {
    expect(parseVersion('1.2.3-beta.4')).toEqual({
      major: 1,
      minor: 2,
      patch: 3,
      prerelease: ['beta', 4],
    });
  });

  it.each(['1.2', '01.2.3', '1.2.3-', '1.2.3+build.1', 'v1.2.3', '', '1.2.3-beta..1'])(
    'rejects %j',
    (text) => {
      expect(() => parseVersion(text)).toThrow('is not a valid semver version');
    },
  );
});

describe('compareVersions', () => {
  // The precedence example from semver.org, item 11.
  const ORDERED = [
    '1.0.0-alpha',
    '1.0.0-alpha.1',
    '1.0.0-alpha.beta',
    '1.0.0-beta',
    '1.0.0-beta.2',
    '1.0.0-beta.11',
    '1.0.0-rc.1',
    '1.0.0',
    '1.0.1',
    '1.1.0',
    '2.0.0',
  ];

  it('orders versions by semver precedence', () => {
    for (let i = 1; i < ORDERED.length; i += 1) {
      expect(compareVersions(ORDERED[i - 1], ORDERED[i])).toBe(-1);
      expect(compareVersions(ORDERED[i], ORDERED[i - 1])).toBe(1);
    }
  });

  it('compares numerically, not as strings', () => {
    expect(compareVersions('1.10.0', '1.9.0')).toBe(1);
  });

  it('returns 0 for equal versions', () => {
    expect(compareVersions('1.2.3-rc.1', '1.2.3-rc.1')).toBe(0);
  });
});

describe('incrementVersion', () => {
  it.each([
    ['1.2.3', 'major', undefined, '2.0.0'],
    ['1.2.3', 'minor', undefined, '1.3.0'],
    ['1.2.3', 'patch', undefined, '1.2.4'],
    ['1.2.3', 'premajor', 'beta', '2.0.0-beta.0'],
    ['1.2.3', 'preminor', 'beta', '1.3.0-beta.0'],
    ['1.2.3', 'prepatch', undefined, '1.2.4-0'],
    ['1.2.3', 'prerelease', 'rc', '1.2.4-rc.0'],
    ['1.3.0-beta.1', 'prerelease', undefined, '1.3.0-beta.2'],
    ['1.3.0-beta.1', 'prerelease', 'beta', '1.3.0-beta.2'],
    ['1.3.0-beta.1', 'prerelease', 'rc', '1.3.0-rc.0'],
    ['1.3.0-beta', 'prerelease', undefined, '1.3.0-beta.0'],
    // Releasing a prerelease finishes it instead of skipping a version.
    ['2.0.0-beta.1', 'major', undefined, '2.0.0'],
    ['1.3.0-beta.1', 'minor', undefined, '1.3.0'],
    ['1.3.1-beta.1', 'minor', undefined, '1.4.0'],
    ['1.3.1-beta.1', 'patch', undefined, '1.3.1'],
    ['1.3.1-beta.1', 'prepatch', 'beta', '1.3.2-beta.0'],
  ])('%s %s (preid %s) -> %s', (current, type, preid, expected) => {
    expect(incrementVersion(current, type, preid)).toBe(expected);
  });

  it('rejects an unknown release type', () => {
    expect(() => incrementVersion('1.2.3', 'micro')).toThrow('Unknown release type "micro"');
  });

  it('rejects an invalid preid', () => {
    expect(() => incrementVersion('1.2.3', 'prepatch', 'be.ta')).toThrow('Invalid preid');
  });
});

describe('resolveTargetVersion', () => {
  it('resolves a keyword', () => {
    expect(resolveTargetVersion('1.0.0', 'minor')).toBe('1.1.0');
  });

  it('accepts a newer explicit version, with or without a leading v', () => {
    expect(resolveTargetVersion('1.0.0', '1.4.0')).toBe('1.4.0');
    expect(resolveTargetVersion('1.0.0', 'v1.4.0-rc.1')).toBe('1.4.0-rc.1');
  });

  it('refuses the current version', () => {
    expect(() => resolveTargetVersion('1.0.0', '1.0.0')).toThrow(
      '1.0.0 is already the current version',
    );
  });

  it('refuses going backwards, including to a prerelease of the current version', () => {
    expect(() => resolveTargetVersion('1.2.0', '1.1.9')).toThrow(
      '1.1.9 is older than the current version 1.2.0',
    );
    expect(() => resolveTargetVersion('1.2.0', '1.2.0-rc.1')).toThrow('is older than');
  });

  it('refuses a non-semver target or current version', () => {
    expect(() => resolveTargetVersion('1.0.0', 'latest')).toThrow('not a valid semver');
    expect(() => resolveTargetVersion('1.0', 'patch')).toThrow('not a valid semver');
  });
});
