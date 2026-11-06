const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier');

module.exports = defineConfig([
  expoConfig,
  prettierConfig,
  { ignores: ['dist/*', 'graphify-out/*', '.expo/*'] },
  {
    files: ['app/**/*.{ts,tsx}', 'src/**/*.{ts,tsx}'],
    rules: {
      'no-console': 'error',
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              // FSD public API: import a slice through its index.ts. `@x` is the FSD cross-import API.
              regex: '^@/[^/]+/[^/]+/(?!@x/).+',
              message: 'Deep import. Import the slice through its index.ts.',
            },
          ],
        },
      ],
    },
  },
  {
    // The logger is the one place allowed to write to the console (conventions: logging).
    files: ['src/shared/lib/logger.ts'],
    rules: { 'no-console': 'off' },
  },
]);
