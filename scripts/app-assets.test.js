const fs = require('node:fs');
const path = require('node:path');

const appJson = require('../app.json');
const colors = require('../src/shared/ui/theme/colors.json');

const ROOT = path.join(__dirname, '..');
const ASSETS_DIR = path.join(ROOT, 'assets');
const STARTER_BACKGROUND = '#E6F4FE';

/** Every string in app.json that is a relative path (`./…`), with where it was found. */
function collectPaths(value, trail = 'app.json') {
  if (typeof value === 'string') return value.startsWith('./') ? [{ trail, file: value }] : [];
  if (value === null || typeof value !== 'object') return [];
  return Object.entries(value).flatMap(([key, child]) => collectPaths(child, `${trail}.${key}`));
}

describe('app.json assets', () => {
  const referenced = collectPaths(appJson);

  it('references only files that exist', () => {
    const missing = referenced.filter(({ file }) => !fs.existsSync(path.join(ROOT, file)));
    expect(missing).toEqual([]);
  });

  it('finds the icon, adaptive icon, favicon and splash references', () => {
    const files = referenced.map(({ file }) => file);
    expect(files).toEqual(
      expect.arrayContaining([
        appJson.expo.icon,
        appJson.expo.android.adaptiveIcon.foregroundImage,
        appJson.expo.android.adaptiveIcon.monochromeImage,
        appJson.expo.web.favicon,
        './assets/splash-icon.png',
      ]),
    );
  });

  it('leaves no unused file in assets/', () => {
    const used = new Set(referenced.map(({ file }) => path.basename(file)));
    expect(fs.readdirSync(ASSETS_DIR).filter((name) => !used.has(name))).toEqual([]);
  });

  it('uses the surface token behind the adaptive icon, not the starter colour', () => {
    const { backgroundColor } = appJson.expo.android.adaptiveIcon;
    expect(backgroundColor).toBe(colors.surface.DEFAULT);
    expect(backgroundColor).not.toBe(STARTER_BACKGROUND);
  });
});
