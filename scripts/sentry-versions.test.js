const pkg = require('../package.json');
const sdk = require('@sentry/react-native/package.json');

describe('@sentry/core', () => {
  // The app imports the offline transport from @sentry/core (the React Native SDK does not
  // re-export it). Two copies of core would not share types or state, so the declared version
  // must be the one the SDK itself depends on. On an SDK upgrade, change both together.
  it('is pinned to the version @sentry/react-native depends on', () => {
    expect(pkg.dependencies['@sentry/core']).toBe(sdk.dependencies['@sentry/core']);
  });
});
