const expoPreset = require('jest-expo/jest-preset');

// Packages that ship untranspiled ESM and must go through Babel (added: lucide-react-native).
const TRANSPILED_PACKAGES = [
  '.pnpm',
  'react-native',
  '@react-native',
  '@react-native-community',
  'expo',
  '@expo',
  '@expo-google-fonts',
  'react-navigation',
  '@react-navigation',
  '@sentry/react-native',
  'native-base',
  'standard-navigation',
  'lucide-react-native',
];

/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  // Reanimated 4 / Worklets: resolve their web implementations in Jest.
  resolver: 'react-native-reanimated/jest/resolver',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  // Each RN/Expo test worker grows to several hundred MB, and its heap keeps growing from suite to
  // suite. With the default (cores - 1) workers and a cold transform cache, a 12-thread / 8 GB
  // machine ran out of memory: tests slowed past their timeouts at random and the run could be
  // killed. Half the cores, and recycling a worker once it holds more than 700 MB, kept a cold
  // run at >= 1.5 GB free with every suite green. CI runners (4 vCPU) get 2 workers either way.
  maxWorkers: '50%',
  workerIdleMemoryLimit: '700MB',
  moduleNameMapper: { '\\.css$': '<rootDir>/jest.style-stub.js' },
  testPathIgnorePatterns: ['/node_modules/', '/graphify-out/'],
  // lucide-react-native's react-native entry is .mjs, which the preset's transform does not match.
  transform: { '\\.mjs$': expoPreset.transform['\\.[jt]sx?$'] },
  transformIgnorePatterns: [
    `/node_modules/(?!(${TRANSPILED_PACKAGES.join('|')}))`,
    '/node_modules/react-native-reanimated/plugin/',
    '/node_modules/@react-native/babel-preset/',
  ],
};
