import { describe, expect, it } from 'vitest';
import { isValidBeanColor, BEAN_COLORS } from '../../constants/bean-colors';

describe('bean colors', () => {
  it('should contain expected colors', () => {
    expect(BEAN_COLORS).toContain('white');
    expect(BEAN_COLORS).toContain('black');
    expect(BEAN_COLORS).toHaveLength(7);
  });

  it('should validate valid colors', () => {
    expect(isValidBeanColor('red')).toBe(true);
    expect(isValidBeanColor('purple')).toBe(true);
  });

  it('should reject invalid colors', () => {
    expect(isValidBeanColor('orange')).toBe(false);
    expect(isValidBeanColor('')).toBe(false);
  });
});
