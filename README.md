# Buildkite Rstest Test Engine POC

This repo checks whether Buildkite Test Engine can ingest Rstest results through a custom Buildkite JSON reporter and still support flaky-test workflows.

## What This Proves

- Rstest can run TypeScript tests.
- Rstest can emit Buildkite JSON at `reports/buildkite-results.json` using [`rstest-buildkite-reporter`](https://github.com/giavinh79/buildkite-rstest-custom-reporter).
- Rstest still emits JUnit XML at `reports/junit.xml` for side-by-side inspection.
- Buildkite can import the custom JSON through the `test-collector` plugin.
- Buildkite can see mixed pass/fail results for the same test on the same commit when the pipeline is rebuilt.

## Local Usage

```sh
pnpm install
pnpm test
```

To inspect the failure output shape locally:

```sh
pnpm test:flaky:fail
```

That command is expected to fail and still write both `reports/junit.xml` and `reports/buildkite-results.json`.

## Buildkite Setup

1. Create a Buildkite Test Engine test suite.
2. Create a Test Engine analytics token for that suite.
3. Add the token to the Buildkite pipeline as the Buildkite secret `RSTEST_TEST_SUITE_TOKEN`.
4. Connect this GitHub repo to a Buildkite pipeline.
5. Use `.buildkite/pipeline.yml` as the pipeline definition.

The pipeline runs:

```sh
pnpm test:ci
```

Then the Buildkite `test-collector` plugin imports:

```txt
reports/buildkite-results.json
```

## Flaky Test Probe

`tests/flaky.test.ts` includes a test that fails on odd `BUILDKITE_BUILD_NUMBER` values and passes on even values. Rebuilding the same commit should produce mixed pass/fail results for the same test identity, which is the fastest way to check whether Test Engine detects flakiness from Rstest JUnit XML.

There is also a random probe disabled by default. To enable it:

```sh
RANDOM_FLAKE_RATE=0.25 pnpm test:ci
```

## Metadata Comparison

The custom reporter output should add metadata that JUnit XML does not represent as cleanly:

- `file_name`
- `location` as `./path/to/test.ts:line`
- `failure_reason`
- `failure_expanded` with backtrace
- execution-level tags
- JSON `history` with `start_at`, `end_at`, and `duration`

Buildkite documents that JUnit XML import does not provide detailed span information. The custom reporter does not add HTTP/SQL span data either; this POC is focused on test identity, location, failure, tag, and history metadata.
