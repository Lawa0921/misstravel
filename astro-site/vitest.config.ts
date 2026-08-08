import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    globalSetup: './tests/global-setup.ts',
    testTimeout: 120000,
    exclude: [...configDefaults.exclude, 'tests/e2e/**'],
  },
});
