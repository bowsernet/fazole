import type { BeanColor } from '../types/bean';

export const BEAN_COLORS: readonly BeanColor[] = [
  'white', 'yellow', 'brown', 'pink', 'red', 'purple', 'black',
] as const;

export function isValidBeanColor(value: string): value is BeanColor {
  return (BEAN_COLORS as readonly string[]).includes(value);
}
