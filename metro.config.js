const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const { refreshBuildInfo } = require('./scripts/generate-build-info');

// Every Metro start (`npx expo start`, `expo export`, the npm scripts) bundles the commit it
// runs from: build-info.json is rewritten before the first module is resolved (D-75).
refreshBuildInfo(__dirname);

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: './src/app/styles/global.css' });
