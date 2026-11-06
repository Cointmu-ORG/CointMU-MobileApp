import en from './en.json';
import id from './id.json';

function flattenKeys(node: unknown, prefix = ''): string[] {
  if (typeof node !== 'object' || node === null) return [prefix];
  return Object.entries(node).flatMap(([key, value]) =>
    flattenKeys(value, prefix ? `${prefix}.${key}` : key),
  );
}

describe('locales', () => {
  it('en and id define exactly the same keys', () => {
    expect(flattenKeys(id).sort()).toEqual(flattenKeys(en).sort());
  });
});
