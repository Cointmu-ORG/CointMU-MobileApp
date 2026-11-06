const { parseArgs } = require('./bump-version');

describe('parseArgs', () => {
  it('reads the bump type, codename and flags', () => {
    expect(
      parseArgs(['preminor', 'Siren', '--preid=beta', '--dry-run', '--no-commit-hooks']),
    ).toEqual({
      isHelp: false,
      isDryRun: true,
      bumpType: 'preminor',
      codename: 'Siren',
      preid: 'beta',
      passthrough: ['--no-commit-hooks'],
    });
  });

  it('accepts --preid as a separate argument', () => {
    expect(parseArgs(['prepatch', 'Siren', '--preid', 'rc']).preid).toBe('rc');
  });

  it('returns early for --help', () => {
    expect(parseArgs(['--help']).isHelp).toBe(true);
  });

  it('requires a bump type and a codename', () => {
    expect(() => parseArgs(['patch'])).toThrow('Missing <bump-type> or <codename>');
  });

  it('points a third positional to --preid', () => {
    expect(() => parseArgs(['prepatch', 'Siren', 'beta.1'])).toThrow(
      'e.g.: prepatch Siren --preid=beta',
    );
  });

  it('rejects a codename that would break the commit message', () => {
    expect(() => parseArgs(['patch', 'Siren %s'])).toThrow('Invalid codename "Siren %s"');
  });
});
