import type { ExplicitAny } from '../../types/explicit-any.ts';

export function isStrictEqual<GValue = ExplicitAny>(a: GValue, b: GValue): boolean {
  return a === b;
}
