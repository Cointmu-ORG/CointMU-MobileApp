const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  formatChanges,
  planReleaseChanges,
  readCurrentVersion,
  readReleaseFiles,
  stampCodename,
  updateAppJsonVersion,
} = require('./release-files');

// Mirrors the repo's app.json layout: Prettier keeps the plugin array on one line.
const APP_JSON = `{
  "expo": {
    "name": "Muvo",
    "version": "1.0.0",
    "ios": { "bundleIdentifier": "com.cointmu.muvo" },
    "plugins": [["expo-router", { "root": "./app" }], ["some-plugin", { "version": "1.0.0" }]]
  }
}
`;
const PACKAGE_JSON = `${JSON.stringify({ name: 'muvo', version: '1.0.0', private: true }, null, 2)}\n`;
const PACKAGE_LOCK = `${JSON.stringify(
  { name: 'muvo', version: '1.0.0', lockfileVersion: 3, packages: { '': { version: '1.0.0' } } },
  null,
  2,
)}\n`;

/**
 * Writes the release files into a fresh temp dir.
 * @param {Record<string, string>} [overrides] - File name -> content.
 * @returns {string} The temp dir.
 */
function makeRepo(overrides = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'muvo-release-'));
  const files = {
    'package.json': PACKAGE_JSON,
    'package-lock.json': PACKAGE_LOCK,
    'app.json': APP_JSON,
    ...overrides,
  };
  Object.entries(files).forEach(([name, text]) => fs.writeFileSync(path.join(dir, name), text));
  return dir;
}

const tempDirs = [];
afterEach(() => {
  tempDirs.splice(0).forEach((dir) => fs.rmSync(dir, { recursive: true, force: true }));
});

/**
 * Reads the release files from a temp repo that is cleaned up after the test.
 * @param {Record<string, string>} [overrides] - File name -> content.
 * @returns {import('./release-files').ReleaseFiles} The file contents.
 */
function readFixture(overrides) {
  const dir = makeRepo(overrides);
  tempDirs.push(dir);
  return readReleaseFiles(dir);
}

describe('updateAppJsonVersion', () => {
  it('changes only expo.version and keeps the formatting', () => {
    const updated = updateAppJsonVersion(APP_JSON, '1.1.0');

    expect(updated).toBe(APP_JSON.replace('"version": "1.0.0",', '"version": "1.1.0",'));
  });

  it('drops the prerelease suffix', () => {
    expect(JSON.parse(updateAppJsonVersion(APP_JSON, '1.1.0-beta.2')).expo.version).toBe('1.1.0');
  });

  it('returns the text untouched when the store version does not change', () => {
    const text = APP_JSON.replace('"1.0.0",', '"1.1.0",');

    expect(updateAppJsonVersion(text, '1.1.0')).toBe(text);
  });

  it('fails when expo.version is missing', () => {
    expect(() => updateAppJsonVersion('{ "expo": {} }\n', '1.1.0')).toThrow(
      'app.json has no expo.version string',
    );
  });
});

describe('stampCodename', () => {
  it('adds the codename right after version, 2-space indented with a trailing newline', () => {
    const updated = stampCodename(PACKAGE_JSON, 'Siren');

    expect(Object.keys(JSON.parse(updated))).toEqual(['name', 'version', 'codename', 'private']);
    expect(updated).toBe(
      `${JSON.stringify({ name: 'muvo', version: '1.0.0', codename: 'Siren', private: true }, null, 2)}\n`,
    );
  });

  it('replaces an existing codename in place', () => {
    const updated = stampCodename(stampCodename(PACKAGE_JSON, 'Orion'), 'Siren');

    expect(JSON.parse(updated).codename).toBe('Siren');
    expect(Object.keys(JSON.parse(updated))).toEqual(['name', 'version', 'codename', 'private']);
  });
});

describe('planReleaseChanges', () => {
  it('lists the change in every file', () => {
    const changes = planReleaseChanges(readFixture(), { version: '1.1.0-rc.0', codename: 'Siren' });

    expect(changes).toEqual([
      { file: 'package.json', field: 'version', from: '1.0.0', to: '1.1.0-rc.0' },
      { file: 'package.json', field: 'codename', from: '(none)', to: 'Siren' },
      { file: 'package-lock.json', field: 'version', from: '1.0.0', to: '1.1.0-rc.0' },
      { file: 'package-lock.json', field: 'packages[""].version', from: '1.0.0', to: '1.1.0-rc.0' },
      { file: 'app.json', field: 'expo.version', from: '1.0.0', to: '1.1.0' },
    ]);
  });

  it.each([
    ['package.json', '{ "version": '],
    ['package-lock.json', 'not json'],
    ['app.json', '{ "expo": { "version": "1.0.0", } }'],
  ])('fails when %s does not parse', (file, text) => {
    const files = readFixture({ [file]: text });

    expect(() => planReleaseChanges(files, { version: '1.1.0', codename: 'Siren' })).toThrow(
      `${file} is not valid JSON`,
    );
  });

  it('fails when the lockfile has no root version fields', () => {
    const files = readFixture({ 'package-lock.json': '{ "lockfileVersion": 3 }\n' });

    expect(() => planReleaseChanges(files, { version: '1.1.0', codename: 'Siren' })).toThrow(
      'package-lock.json has no root version fields',
    );
  });
});

describe('readReleaseFiles', () => {
  it('refuses a dynamic app config', () => {
    expect(() => readFixture({ 'app.config.ts': 'export default {};\n' })).toThrow(
      'Found app.config.ts',
    );
  });

  it('reads the current version from package.json', () => {
    expect(readCurrentVersion(readFixture())).toBe('1.0.0');
  });
});

describe('formatChanges', () => {
  it('aligns columns and marks unchanged values', () => {
    const text = formatChanges([
      { file: 'package.json', field: 'version', from: '1.0.0', to: '1.1.0' },
      { file: 'app.json', field: 'expo.version', from: '1.1.0', to: '1.1.0' },
    ]);

    expect(text).toBe(
      [
        '  package.json  version       1.0.0 -> 1.1.0',
        '  app.json      expo.version  1.1.0 (unchanged)',
      ].join('\n'),
    );
  });
});
