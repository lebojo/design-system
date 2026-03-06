import type { TransformedToken, Transform } from 'style-dictionary/types';
import { segmentToCssSegment, CSS_VARIABLE_PREFIX } from './helpers.ts';

/**
 * Name transform that replicates the exact naming logic from the custom DTCG framework.
 * Converts token path segments to CSS variable segments, filtering empty/dash segments.
 */
export const nameTransform: Transform = {
  name: 'esds/name',
  type: 'name',
  transform: (token: TransformedToken): string => {
    return token.path
      .map(segmentToCssSegment)
      .filter((s: string) => s !== '' && s !== '-')
      .join('-');
  },
};

/**
 * Typography shorthand transform.
 * Converts typography composite tokens to CSS font shorthand using var() references.
 * Output: var(--esds-font-weight) var(--esds-font-size)/var(--esds-line-height) var(--esds-font-family)
 */
export const typographyShorthandTransform: Transform = {
  name: 'esds/typography-shorthand',
  type: 'value',
  transitive: true,
  filter: (token: TransformedToken): boolean => {
    return token.$type === 'typography' || token.type === 'typography';
  },
  transform: (token: TransformedToken): string => {
    // Use original.$value to access the raw references
    const original = token.original?.$value ?? token.$value;
    if (!original || typeof original !== 'object') return String(token.$value);

    const refToVar = (ref: string): string => {
      if (typeof ref === 'string' && ref.startsWith('{') && ref.endsWith('}')) {
        const path = ref.slice(1, -1).split('.');
        const segments = path
          .map(segmentToCssSegment)
          .filter((s: string) => s !== '' && s !== '-')
          .join('-');
        return `var(--${CSS_VARIABLE_PREFIX}-${segments})`;
      }
      return String(ref);
    };

    const fontWeight = refToVar(original.fontWeight);
    const fontSize = refToVar(original.fontSize);
    const lineHeight = refToVar(original.lineHeight);
    const fontFamily = refToVar(original.fontFamily);

    return `${fontWeight} ${fontSize}/${lineHeight} ${fontFamily}`;
  },
};
