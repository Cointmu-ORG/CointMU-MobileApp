import fsd from '@feature-sliced/steiger-plugin';
import { defineConfig } from 'steiger';

export default defineConfig([
  ...fsd.configs.recommended,
  {
    rules: {
      // D-31: the architecture defines slices that have a single consumer by design in the MVP
      // (each feature, entities/account). Revisit once the slice set settles.
      'fsd/insignificant-slice': 'off',
    },
  },
]);
