import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import type { Reporter, TestCaseInfo, TestResult } from '@rstest/core';

export interface BuildkiteReporterOptions {
  outputPath?: string;
  rootPath?: string;
  tags?: Record<string, string>;
}

type BuildkiteResultStatus = 'passed' | 'failed' | 'skipped' | 'unknown';

export interface BuildkiteTestEngineTest {
  id: string;
  scope: string;
  name: string;
  location: string;
  file_name: string;
  result: BuildkiteResultStatus;
  failure_reason?: string;
  failure_expanded?: Array<{ expanded: string[]; backtrace: string[] }>;
  history: {
    start_at: number;
    end_at: number;
    duration: number;
  };
  tags?: Record<string, string>;
}

interface TestMetadata {
  info: TestCaseInfo;
  startedAt: number;
}

export class BuildkiteReporter implements Reporter {
  private readonly outputPath: string;
  private readonly rootPath: string;
  private readonly tags?: Record<string, string>;
  private readonly testsById = new Map<string, TestMetadata>();
  private runStartedAt = performance.now();

  constructor(options: BuildkiteReporterOptions = {}) {
    this.rootPath = options.rootPath ?? process.cwd();
    this.tags = options.tags;

    const resolved = options.outputPath ?? process.env.BUILDKITE_TEST_ENGINE_RESULT_PATH;
    if (!resolved) {
      throw new Error(
        'BuildkiteReporter: set BUILDKITE_TEST_ENGINE_RESULT_PATH or pass outputPath.',
      );
    }

    this.outputPath = path.isAbsolute(resolved)
      ? resolved
      : path.resolve(this.rootPath, resolved);
  }

  onTestRunStart(): void {
    this.runStartedAt = performance.now();
    this.testsById.clear();
  }

  onTestCaseStart(test: TestCaseInfo): void {
    this.testsById.set(test.testId, {
      info: test,
      startedAt: performance.now(),
    });
  }

  async onTestRunEnd(
    { testResults }: Parameters<NonNullable<Reporter['onTestRunEnd']>>[0],
  ): Promise<void> {
    const payload = testResults.map(testResult => this.toBuildkiteTest(testResult));

    await fs.mkdir(path.dirname(this.outputPath), { recursive: true });
    await fs.writeFile(
      this.outputPath,
      JSON.stringify(payload, null, 2),
      'utf-8',
    );
  }

  private toBuildkiteTest(result: TestResult): BuildkiteTestEngineTest {
    const testMetadata = this.testsById.get(result.testId);
    const relPath = this.relativePath(result.testPath);
    const duration = seconds(result.duration ?? 0);
    const startAt = this.startAt(testMetadata);

    const test: BuildkiteTestEngineTest = {
      id: randomUUID(),
      scope: (result.parentNames ?? []).join(' '),
      name: result.name,
      location: this.location(relPath, testMetadata?.info),
      file_name: this.buildkitePath(relPath),
      result: mapStatus(result.status),
      history: {
        start_at: startAt,
        end_at: startAt + duration,
        duration,
      },
    };

    if (this.tags && Object.keys(this.tags).length > 0) {
      test.tags = this.tags;
    }

    if (test.result === 'failed' && result.errors?.length) {
      const firstError = result.errors[0];
      test.failure_reason = stripAnsi(firstError.message);

      if (firstError.stack) {
        test.failure_expanded = [
          {
            expanded: firstError.diff
              ? stripAnsi(firstError.diff).split('\n')
              : stripAnsi(firstError.message).split('\n').slice(1),
            backtrace: stripAnsi(firstError.stack).split('\n'),
          },
        ];
      }
    }

    return test;
  }

  private relativePath(absOrRel: string): string {
    const relativePath = path.isAbsolute(absOrRel)
      ? path.relative(this.rootPath, absOrRel)
      : absOrRel;

    return relativePath.split(path.sep).join('/');
  }

  private buildkitePath(relPath: string): string {
    return relPath.startsWith('./') ? relPath : `./${relPath}`;
  }

  private location(relPath: string, testInfo: TestCaseInfo | undefined): string {
    const filePath = this.buildkitePath(relPath);

    if (!testInfo?.location) {
      return filePath;
    }

    return `${filePath}:${testInfo.location.line}`;
  }

  private startAt(testMetadata: TestMetadata | undefined): number {
    return seconds(
      Math.max(0, (testMetadata?.startedAt ?? this.runStartedAt) - this.runStartedAt),
    );
  }
}

export function buildkiteReporterIfEnabled(
  options: BuildkiteReporterOptions = {},
): BuildkiteReporter[] {
  if (!options.outputPath && !process.env.BUILDKITE_TEST_ENGINE_RESULT_PATH) {
    return [];
  }

  return [new BuildkiteReporter(options)];
}

const ANSI_PATTERN = /(?:\x1B\[|\x9B)[0-9;]*m/g;

function stripAnsi(value: string): string {
  return value.replace(ANSI_PATTERN, '');
}

function mapStatus(status: TestResult['status']): BuildkiteResultStatus {
  switch (status) {
    case 'pass':
      return 'passed';
    case 'fail':
      return 'failed';
    case 'skip':
    case 'todo':
      return 'skipped';
    default:
      return 'unknown';
  }
}

function seconds(milliseconds: number): number {
  return milliseconds / 1000;
}
