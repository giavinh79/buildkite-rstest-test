import { defineConfig } from '@rstest/core';

export default defineConfig({
  include: ['tests/**/*.test.ts'],
  testEnvironment: 'node',
  passWithNoTests: false,
  retry: Number(process.env.RSTEST_RETRY ?? '0'),
  reporters: [
    'default',
    ['junit', { outputPath: process.env.JUNIT_OUTPUT ?? './reports/junit.xml' }],
  ],
});
