import type { TransformedToken } from 'style-dictionary/types';
import {
  T1_DIRECTORY_NAME,
  T2_DIRECTORY_NAME,
  T3_DIRECTORY_NAME,
  segmentToCssSegment,
  CSS_VARIABLE_PREFIX,
} from '../helpers.ts';

interface FigmaToken {
  $type: string;
  $value: unknown;
  scopes: string[];
  $extensions?: {
    mode?: Record<string, unknown>;
  };
}

type FigmaTree = FigmaToken | Record<string, any>;

function getTier(filePath: string): string | undefined {
  if (filePath.includes(T1_DIRECTORY_NAME)) return 't1';
  if (filePath.includes(T2_DIRECTORY_NAME)) return 't2';
  if (filePath.includes(T3_DIRECTORY_NAME)) return 't3';
  return undefined;
}

/**
 * Converts a token to its Figma representation based on type.
 * Figma uses simplified types: color -> color (hex), dimension -> number,
 * fontFamily -> string, fontWeight -> number, number -> number, etc.
 */
function tokenToFigmaValue(token: TransformedToken): { $type: string; $value: unknown } {
  const type = token.$type || token.type || '';
  const value = token.$value ?? token.value;

  switch (type) {
    case 'color':
      return { $type: 'color', $value: String(value) };
    case 'dimension': {
      // Extract numeric value from dimension string like "16px"
      const numVal = parseFloat(String(value));
      return { $type: 'number', $value: isNaN(numVal) ? 0 : numVal };
    }
    case 'fontFamily':
      return { $type: 'string', $value: String(value) };
    case 'fontWeight': {
      const fwVal = typeof value === 'number' ? value : parseInt(String(value), 10);
      return { $type: 'number', $value: isNaN(fwVal) ? 400 : fwVal };
    }
    case 'number':
      return { $type: 'number', $value: typeof value === 'number' ? value : parseFloat(String(value)) };
    default:
      // For composite types (shadow, typography, border, etc.), use the raw value
      return { $type: type, $value: value };
  }
}

/**
 * Checks if a token value is a reference (original value starts with {).
 */
function isTokenReference(token: TransformedToken): boolean {
  const original = token.original?.$value;
  return typeof original === 'string' && original.startsWith('{') && original.endsWith('}');
}

/**
 * Gets the Figma reference value for a token (with tier prefix).
 */
function getFigmaReference(token: TransformedToken, tier: string): string {
  const original = String(token.original?.$value);
  // Original is like {color.red.500} - need to add tier prefix -> {t1.color.red.500}
  const refPath = original.slice(1, -1); // remove { }

  // Determine which tier the referenced token belongs to
  // T2 tokens reference T1 tokens, T3 tokens reference T2 tokens
  // For Figma, we always prefix the reference with the appropriate tier
  return `{${tier === 't2' ? 't1' : tier === 't3' ? 't2' : 't1'}.${refPath}}`;
}

/**
 * Inserts a value into a nested object tree at the given path.
 */
function insertIntoTree(tree: Record<string, any>, path: string[], value: any): void {
  let node = tree;
  for (let i = 0; i < path.length; i++) {
    const segment = path[i]!;
    if (i === path.length - 1) {
      // Check if this node is a token (has $value) and we're trying to add children
      if (node.$value !== undefined) {
        const tokenData = { ...node };
        for (const key of Object.keys(node)) {
          delete node[key];
        }
        node['root'] = tokenData;
      }
      node[segment] = value;
    } else {
      if (!(segment in node)) {
        node[segment] = {};
      } else if (node[segment].$value !== undefined) {
        // If existing node is a token, move it to 'root'
        const tokenData = { ...node[segment] };
        node[segment] = { root: tokenData };
      }
      node = node[segment];
    }
  }
}

/**
 * Merges multiple named token sets as Figma modes.
 * Creates $extensions.mode property mapping mode names to values.
 */
function mergeFigmaTreesAsModes(
  tokensToMerge: Array<[string, Record<string, any>]>,
): Record<string, any> {
  if (tokensToMerge.length === 0) {
    throw new Error('Expected at least one token set.');
  }

  // Determine if this level contains tokens or groups
  const [, firstTokens] = tokensToMerge[0]!;
  const isToken = '$value' in firstTokens;

  if (isToken) {
    // Merge as token with modes
    return {
      ...firstTokens,
      $extensions: {
        mode: Object.fromEntries(
          tokensToMerge.map(([name, tree]) => [name, tree.$value]),
        ),
      },
    };
  }

  // Merge as group - recurse into each key
  const allKeys = new Set<string>();
  for (const [, tokens] of tokensToMerge) {
    for (const key of Object.keys(tokens)) {
      allKeys.add(key);
    }
  }

  const result: Record<string, any> = {};
  for (const key of allKeys) {
    result[key] = mergeFigmaTreesAsModes(
      tokensToMerge.map(([name, tokens]) => {
        const child = tokens[key];
        if (child === undefined) {
          throw new Error(`Expected child "${key}" to exist in all modes.`);
        }
        return [name, child];
      }),
    );
  }

  return result;
}

/**
 * Builds the Figma tokens JSON from SD token data.
 * Groups tokens by tier, applies tier prefixes, and merges theme modes.
 */
export function buildFigmaTokens(
  baseTokens: TransformedToken[],
  themeTokenSets: Map<string, TransformedToken[]>,
): string {
  const figmaTokens: Record<string, any> = {};

  // Build set of T2 token names from base (where filePath is reliable)
  const baseT2Names = new Set<string>();
  for (const token of baseTokens) {
    if (getTier(token.filePath ?? '') === 't2') {
      baseT2Names.add(token.path.join('.'));
    }
  }

  // 1) Build T1 tokens (no modes)
  for (const token of baseTokens) {
    const tier = getTier(token.filePath ?? '');
    if (tier !== 't1') continue;

    const scopes = token.$extensions?.scopes ?? [];
    const { $type, $value } = tokenToFigmaValue(token);

    const figmaToken: FigmaToken = {
      $type,
      $value: normalizeHexValue($type, $value),
      scopes: scopes as string[],
    };

    insertIntoTree(figmaTokens, ['t1', ...token.path], figmaToken);
  }

  // 2) Build T2 tokens with theme modes
  // For each theme, find all T2 tokens (by matching base T2 paths)
  const themeTrees: Array<[string, Record<string, any>]> = [];

  for (const [themeName, themeTokens] of themeTokenSets.entries()) {
    const themeTree: Record<string, any> = {};

    for (const token of themeTokens) {
      // A token is T2 if it matches a base T2 path OR its filePath is T2
      const tokenName = token.path.join('.');
      const isT2 = baseT2Names.has(tokenName) || getTier(token.filePath ?? '') === 't2';
      if (!isT2) continue;

      const scopes = token.$extensions?.scopes ?? [];
      const { $type, $value: figmaValue } = tokenToFigmaValue(token);

      // Use reference if the original value is a reference
      let finalValue: unknown = figmaValue;
      if (isTokenReference(token)) {
        finalValue = getFigmaReference(token, 't2');
      }

      const figmaToken: FigmaToken = {
        $type,
        $value: normalizeHexValue($type, finalValue),
        scopes: scopes as string[],
      };

      insertIntoTree(themeTree, ['t2', ...token.path], figmaToken);
    }

    themeTrees.push([themeName, themeTree]);
  }

  // Merge T2 trees as modes
  if (themeTrees.length > 0) {
    const mergedT2 = mergeFigmaTreesAsModes(themeTrees);
    Object.assign(figmaTokens, mergedT2);
  }

  return JSON.stringify(figmaTokens, null, 2);
}

/**
 * Normalizes hex values to full 6/8 character format.
 */
function normalizeHexValue(type: string, value: unknown): unknown {
  if (type !== 'color' || typeof value !== 'string') return value;
  if (!value.startsWith('#')) return value;

  let h = value.slice(1);
  if (h.length === 3) h = h[0]! + h[0]! + h[1]! + h[1]! + h[2]! + h[2]!;
  if (h.length === 4) h = h[0]! + h[0]! + h[1]! + h[1]! + h[2]! + h[2]! + h[3]! + h[3]!;
  return '#' + h;
}
