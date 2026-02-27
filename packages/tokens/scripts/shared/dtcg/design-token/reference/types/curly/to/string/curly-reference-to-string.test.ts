import { describe, expect, test } from 'vitest';
import { curlyReferenceToString } from './curly-reference-to-string.ts';

describe('curlyReferenceToString', () => {
  test('should unwrap valid curly references', () => {
    expect(curlyReferenceToString('{color.red.500}')).toBe('color.red.500');
    expect(curlyReferenceToString('{spacing.8}')).toBe('spacing.8');
    expect(curlyReferenceToString('{font.family.inter}')).toBe('font.family.inter');
  });

  test('should handle single-segment references', () => {
    expect(curlyReferenceToString('{token}')).toBe('token');
    expect(curlyReferenceToString('{color}')).toBe('color');
  });

  test('should throw for empty braces', () => {
    expect(() => curlyReferenceToString('{}' as unknown as `{${string}}`)).toThrow(
      'Expected curly reference like {token.name}, got: {}',
    );
  });

  test('should throw for strings without braces', () => {
    expect(() => curlyReferenceToString('color.red.500' as unknown as `{${string}}`)).toThrow(
      'Expected curly reference like {token.name}, got: color.red.500',
    );
  });

  test('should throw for strings with only opening brace', () => {
    expect(() => curlyReferenceToString('{color.red.500' as unknown as `{${string}}`)).toThrow(
      'Expected curly reference like {token.name}, got: {color.red.500',
    );
  });

  test('should throw for strings with only closing brace', () => {
    expect(() => curlyReferenceToString('color.red.500}' as unknown as `{${string}}`)).toThrow(
      'Expected curly reference like {token.name}, got: color.red.500}',
    );
  });

  test('should throw for null', () => {
    expect(() => curlyReferenceToString(null as unknown as `{${string}}`)).toThrow(
      'Expected curly reference like {token.name}, got: null',
    );
  });

  test('should throw for undefined', () => {
    expect(() => curlyReferenceToString(undefined as unknown as `{${string}}`)).toThrow(
      'Expected curly reference like {token.name}, got: undefined',
    );
  });

  test('should throw for numbers', () => {
    expect(() => curlyReferenceToString(123 as unknown as `{${string}}`)).toThrow(
      'Expected curly reference like {token.name}, got: 123',
    );
  });

  test('should throw for empty string', () => {
    expect(() => curlyReferenceToString('' as unknown as `{${string}}`)).toThrow(
      'Expected curly reference like {token.name}, got: ',
    );
  });

  test('should handle references with special characters', () => {
    expect(curlyReferenceToString('{color.red.500.hover}')).toBe('color.red.500.hover');
  });

  test('should handle deeply nested references', () => {
    expect(curlyReferenceToString('{component.button.primary.background.color}')).toBe(
      'component.button.primary.background.color',
    );
  });
});
