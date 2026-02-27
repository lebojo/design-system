import type { CurlyReference } from '../../curly-reference.ts';
import { isCurlyReference } from '../../is-curly-reference.ts';

/**
 * Converts a curly reference to a plain string by removing the braces.
 *
 * @param reference - A curly reference like `{color.red.500}`
 * @returns The unwrapped content like `color.red.500`
 * @throws {Error} If the input is not a valid curly reference
 *
 * @example
 * curlyReferenceToString('{color.red.500}')  // 'color.red.500'
 */
export function curlyReferenceToString(reference: CurlyReference): string {
  if (!isCurlyReference(reference)) {
    throw new Error(`Expected curly reference like {token.name}, got: ${String(reference)}`);
  }
  const inner = reference.slice(1, -1);
  if (inner.length === 0) {
    throw new Error(`Expected curly reference like {token.name}, got: ${reference}`);
  }
  return inner;
}
