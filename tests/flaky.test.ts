import { describe, expect, it } from '@rstest/core';

import { isEvenBuildNumber } from '../src/math';

const randomFlakeRate = Number(process.env.RANDOM_FLAKE_RATE ?? '0');

const shouldForceFailure = (): boolean =>
  process.env.FORCE_FLAKY_FAILURE === 'true';

const shouldFailRandomly = (): boolean =>
  randomFlakeRate > 0 && Math.random() < randomFlakeRate;

const shouldFailOnBuildNumber = (): boolean =>
  process.env.BUILDKITE_BUILD_NUMBER !== undefined &&
  !isEvenBuildNumber(process.env.BUILDKITE_BUILD_NUMBER);

describe('flaky behavior probes', () => {
  it('alternates by Buildkite build number to create mixed results on the same commit', () => {
    expect(shouldFailOnBuildNumber()).toBe(false);
  });

  it('can be forced to fail for local JUnit failure-shape checks', () => {
    expect(shouldForceFailure()).toBe(false);
  });

  it('can fail randomly when RANDOM_FLAKE_RATE is configured', () => {
    expect(shouldFailRandomly()).toBe(false);
  });
});
