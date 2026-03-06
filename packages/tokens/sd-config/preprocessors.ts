import type { PreprocessedTokens } from 'style-dictionary/types';

/**
 * Custom parser that moves root-level $type into each top-level group.
 * This prevents SD5's merge from losing per-file $type when multiple
 * source files define different $type at their root level.
 */
export const fixTypeInheritanceParser = {
  name: 'esds/fix-type-inheritance',
  pattern: /\.tokens\.json$/,
  parser: ({ contents }: { filePath: string; contents: string }) => {
    const data = JSON.parse(contents);
    const rootType = data['$type'];
    if (rootType) {
      delete data['$type'];
      for (const [key, val] of Object.entries(data)) {
        if (key.startsWith('$')) continue;
        if (val && typeof val === 'object' && !(val as any)['$type']) {
          (val as any)['$type'] = rootType;
        }
      }
    }
    return data;
  },
};

/**
 * Walks the token tree and normalizes color values from
 * { colorSpace, components, hex, alpha? } to plain hex strings.
 * Also handles inherited $type from parent groups.
 */
function walkAndNormalizeColors(
  obj: Record<string, any>,
  inheritedType?: string,
): void {
  if (!obj || typeof obj !== 'object') return;

  const currentType = obj.$type ?? inheritedType;

  for (const [key, value] of Object.entries(obj)) {
    if (key.startsWith('$')) continue;
    if (!value || typeof value !== 'object') continue;

    // If this node has $value, it's a token
    if ('$value' in value) {
      const type = value.$type ?? currentType;
      if (type === 'color' && value.$value && typeof value.$value === 'object' && 'hex' in value.$value) {
        value.$value = value.$value.hex;
      }
      // Also recurse into nested tokens
      walkAndNormalizeColors(value, currentType);
    } else {
      // It's a group - recurse
      walkAndNormalizeColors(value, currentType);
    }
  }
}

/**
 * Walks the token tree and normalizes dimension values from
 * { value, unit } to plain strings like "16px".
 */
function walkAndNormalizeDimensions(
  obj: Record<string, any>,
  inheritedType?: string,
): void {
  if (!obj || typeof obj !== 'object') return;

  const currentType = obj.$type ?? inheritedType;

  for (const [key, value] of Object.entries(obj)) {
    if (key.startsWith('$')) continue;
    if (!value || typeof value !== 'object') continue;

    if ('$value' in value) {
      const type = value.$type ?? currentType;
      if (type === 'dimension' && value.$value && typeof value.$value === 'object' && 'value' in value.$value && 'unit' in value.$value) {
        value.$value = `${value.$value.value}${value.$value.unit}`;
      }
      walkAndNormalizeDimensions(value, currentType);
    } else {
      walkAndNormalizeDimensions(value, currentType);
    }
  }
}

export const normalizeColors = {
  name: 'esds/normalize-colors',
  preprocessor: (tokens: PreprocessedTokens): PreprocessedTokens => {
    walkAndNormalizeColors(tokens);
    return tokens;
  },
};

export const normalizeDimensions = {
  name: 'esds/normalize-dimensions',
  preprocessor: (tokens: PreprocessedTokens): PreprocessedTokens => {
    walkAndNormalizeDimensions(tokens);
    return tokens;
  },
};
