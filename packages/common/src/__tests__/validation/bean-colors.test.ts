import { describe, expect, it } from 'vitest';

import { BEAN_COLORS, isValidBeanColor } from '../../constants/bean-colors';

describe('bean colors', () => {
  it('should contain expected colors', () => {
    expect(BEAN_COLORS).toContain('white');
    expect(BEAN_COLORS).toContain('black');
    expect(BEAN_COLORS).toContain('blue');
    expect(BEAN_COLORS).toHaveLength(8);
  });

  it('should validate valid colors', () => {
    expect(isValidBeanColor('red')).toBe(true);
    expect(isValidBeanColor('purple')).toBe(true);
    expect(isValidBeanColor('blue')).toBe(true);
  });

  it('should reject invalid colors', () => {
    expect(isValidBeanColor('orange')).toBe(false);
    expect(isValidBeanColor('')).toBe(false);
  });
});
