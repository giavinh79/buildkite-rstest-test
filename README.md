# Buildkite Rstest Test Engine POC

This repo checks whether Buildkite Test Engine can ingest Rstest results through JUnit XML and still support flaky-test workflows.

## What This Proves

- Rstest can run TypeScript tests.
- Rstest can emit JUnit XML at `reports/junit.xml`.
- Buildkite can import that XML through the `test-collector` plugin.
- Buildkite can see mixed pass/fail results for the same test on the same commit when the pipeline is rebuilt.

## Local Usage

```sh
pnpm install
pnpm test
```

To inspect the JUnit failure shape locally:

```sh
pnpm test:flaky:fail
```

That command is expected to fail and still write `reports/junit.xml`.

## Buildkite Setup

1. Create a Buildkite Test Engine test suite.
2. Create a Test Engine analytics token for that suite.
3. Add the token to the Buildkite pipeline environment as `BUILDKITE_ANALYTICS_TOKEN`.
4. Connect this GitHub repo to a Buildkite pipeline.
5. Use `.buildkite/pipeline.yml` as the pipeline definition.

The pipeline runs:

```sh
pnpm test:ci
```

Then the Buildkite `test-collector` plugin imports:

```txt
reports/junit.xml
```

## Flaky Test Probe

`tests/flaky.test.ts` includes a test that fails on odd `BUILDKITE_BUILD_NUMBER` values and passes on even values. Rebuilding the same commit should produce mixed pass/fail results for the same test identity, which is the fastest way to check whether Test Engine detects flakiness from Rstest JUnit XML.

There is also a random probe disabled by default. To enable it:

```sh
RANDOM_FLAKE_RATE=0.25 pnpm test:ci
```

## Important Limitation

This POC intentionally uses JUnit XML because Rstest is not a native `bktec` runner. Buildkite documents that JUnit XML import does not provide detailed span information, so some Test Engine features may be unavailable compared with a native collector or JSON import.

If JUnit import gives weak flaky/auto-mute behavior, the next POC should be a custom Rstest reporter that uploads Buildkite JSON instead of JUnit XML.
