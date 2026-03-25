import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/unit/**/*.test.mjs', 'tests/integration/**/*.test.mjs'],
    server: {
      deps: {
        inline: [/.*/],
      },
    },
    coverage: {
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.js'],
      exclude: ['src/db/**', 'src/config/**'],
    },
  },
});
