const { getSentryExpoConfig } = require('@sentry/react-native/metro');
const { withNativeWind } = require('nativewind/metro');

const { refreshBuildInfo } = require('./scripts/generate-build-info');

// Every Metro start (`npx expo start`, `expo export`, the npm scripts) bundles the commit it
// runs from: build-info.json is rewritten before the first module is resolved (D-75).
refreshBuildInfo(__dirname);

// Expo's default config plus debug ids in every bundle and source map, which is what lets the
// GlitchTip server match a release stack trace to its uploaded source map (D-82).
const config = getSentryExpoConfig(__dirname);

module.exports = withNativeWind(config, { input: './src/app/styles/global.css' });
