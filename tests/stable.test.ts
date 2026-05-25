import { describe, expect, it } from '@rstest/core';

import { add } from '../src/math';

describe('stable math checks', () => {
  it('adds two numbers', () => {
    expect(add(2, 3)).toBe(5);
  });
});
