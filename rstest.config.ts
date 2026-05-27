import { defineConfig } from '@rstest/core';
import { buildkiteReporterIfEnabled } from './src/buildkite-reporter';

export default defineConfig({
  include: ['tests/**/*.test.ts'],
  includeTaskLocation: true,
  testEnvironment: 'node',
  passWithNoTests: false,
  retry: Number(process.env.RSTEST_RETRY ?? '0'),
  reporters: [
    'default',
    ...buildkiteReporterIfEnabled({
      tags: {
        collector: 'rstest-buildkite-reporter',
        framework: 'rstest',
      },
    }),
    ['junit', { outputPath: process.env.JUNIT_OUTPUT ?? './reports/junit.xml' }],
  ],
});
