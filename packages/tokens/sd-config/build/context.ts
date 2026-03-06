import { mkdir, writeFile, readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import StyleDictionary from 'style-dictionary';
import type { TransformedToken, Config } from 'style-dictionary/types';

import { fixTypeInheritanceParser, normalizeColors, normalizeDimensions } from '../preprocessors.ts';
import { nameTransform, typographyShorthandTransform } from '../transforms.ts';
import {
  CSS_VARIABLE_PREFIX,
  CSS_HEADER,
  T1_DIRECTORY_NAME,
  T2_DIRECTORY_NAME,
  T3_DIRECTORY_NAME,
  DESIGN_TOKEN_TIERS,
  segmentToCssSegment,
} from '../helpers.ts';

export {
  CSS_VARIABLE_PREFIX,
  CSS_HEADER,
  T1_DIRECTORY_NAME,
  T2_DIRECTORY_NAME,
  T3_DIRECTORY_NAME,
  DESIGN_TOKEN_TIERS,
  segmentToCssSegment,
};

export interface BuildContext {
  readonly tokensDir: string;
  readonly distDir: string;
  readonly rootDir: string;
  readonly baseSources: string[];
  readonly baseTokens: TransformedToken[];
}

const PREPROCESSORS = ['esds/normalize-colors', 'esds/normalize-dimensions'];

export function registerHooks(sd: typeof StyleDictionary): void {
  sd.registerParser(fixTypeInheritanceParser);
  sd.registerPreprocessor(normalizeColors);
  sd.registerPreprocessor(normalizeDimensions);
  sd.registerTransform(nameTransform);
  sd.registerTransform(typographyShorthandTransform);
}

export async function collectTokens(sources: string[]): Promise<TransformedToken[]> {
  const config: Config = {
    source: sources,
    log: { verbosity: 'silent' },
    parsers: ['esds/fix-type-inheritance'],
    preprocessors: PREPROCESSORS,
    expand: false,
    platforms: {
      collect: {
        transforms: ['esds/name', 'esds/typography-shorthand'],
        prefix: CSS_VARIABLE_PREFIX,
        options: { outputReferences: true },
        files: [],
      },
    },
  };

  const sd = new StyleDictionary(config);
  const { allTokens } = await sd.getPlatformTokens('collect');

  const tierOrder = (token: TransformedToken): number => {
    const fp = token.filePath ?? '';
    if (fp.includes(T1_DIRECTORY_NAME)) return 0;
    if (fp.includes(T2_DIRECTORY_NAME)) return 1;
    if (fp.includes(T3_DIRECTORY_NAME)) return 2;
    return 3;
  };

  const indexMap = new Map<TransformedToken, number>();
  allTokens.forEach((t, i) => indexMap.set(t, i));

  allTokens.sort((a: TransformedToken, b: TransformedToken) => {
    const tierDiff = tierOrder(a) - tierOrder(b);
    if (tierDiff !== 0) return tierDiff;
    const fpDiff = (a.filePath ?? '').localeCompare(b.filePath ?? '');
    if (fpDiff !== 0) return fpDiff;
    return (indexMap.get(a) ?? 0) - (indexMap.get(b) ?? 0);
  });

  return allTokens;
}

export async function writeFileSafe(filePath: string, content: string): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, content, 'utf-8');
}

export async function listTokenFiles(dir: string): Promise<string[]> {
  try {
    return (await readdir(dir)).filter((f: string) => f.endsWith('.tokens.json'));
  } catch {
    return [];
  }
}

/**
 * Converts a reference like {color.red.500} to var(--esds-color-red-500).
 */
export function refToVar(ref: string): string {
  const refPath = ref.slice(1, -1).split('.');
  const segments = refPath
    .map(segmentToCssSegment)
    .filter((s: string) => s !== '' && s !== '-')
    .join('-');
  return `var(--${CSS_VARIABLE_PREFIX}-${segments})`;
}

/**
 * Gets the CSS value for a token, preserving references as var().
 */
export function tokenToCssValue(token: TransformedToken): string {
  const original = token.original?.$value;
  const type = token.$type || token.type || '';

  if (type === 'typography') {
    return String(token.$value ?? token.value);
  }

  if (type === 'shadow') {
    return formatShadowValue(token);
  }

  if (typeof original === 'string' && original.startsWith('{') && original.endsWith('}')) {
    return refToVar(original);
  }

  if (type === 'fontFamily') {
    const val = String(token.$value ?? token.value);
    if (/[^a-zA-Z0-9\s-]/.test(val) || /\s/.test(val)) {
      return `"${val}"`;
    }
    return val;
  }

  return String(token.$value ?? token.value);
}

function formatShadowValue(token: TransformedToken): string {
  const original = token.original?.$value;
  const shadows = Array.isArray(original) ? original : [original];
  const resolvedShadows = Array.isArray(token.$value ?? token.value)
    ? (token.$value ?? token.value) as any[]
    : [token.$value ?? token.value];

  return shadows.map((shadow: any, idx: number) => {
    if (typeof shadow === 'string' && shadow.startsWith('{') && shadow.endsWith('}')) {
      return refToVar(shadow);
    }
    if (typeof shadow === 'object' && shadow !== null) {
      const resolved = resolvedShadows[idx] ?? shadow;
      const parts = ['x', 'y', 'blur', 'spread', 'color'].map((prop: string) => {
        const origVal = shadow[prop];
        if (typeof origVal === 'string' && origVal.startsWith('{') && origVal.endsWith('}')) {
          return refToVar(origVal);
        }
        if (resolved && typeof resolved === 'object' && prop in resolved) {
          return String(resolved[prop]);
        }
        return String(origVal ?? '');
      });
      return parts.join(' ');
    }
    return String(shadow);
  }).join(', ');
}

export function wrapWithSelector(vars: string, selector: string): string {
  const indented = vars
    .split('\n')
    .map((line: string) => `  ${line}`)
    .join('\n');
  return `${CSS_HEADER}${selector} {\n${indented}\n}\n`;
}

/**
 * Normalizes a hex string to 6 or 8 characters (uppercase).
 */
export function normalizeHex(rawHex: string): string {
  let h = rawHex;
  if (h.length === 3) h = h[0]! + h[0]! + h[1]! + h[1]! + h[2]! + h[2]!;
  if (h.length === 4) h = h[0]! + h[0]! + h[1]! + h[1]! + h[2]! + h[2]! + h[3]! + h[3]!;
  return h;
}

/**
 * Filters base tokens to only T1 non-reference color tokens.
 */
export function filterT1ColorTokens(tokens: TransformedToken[]): TransformedToken[] {
  return tokens.filter((token: TransformedToken) => {
    const type = token.$type || token.type;
    if (type !== 'color') return false;
    if (!(token.filePath ?? '').includes(T1_DIRECTORY_NAME)) return false;
    const original = token.original?.$value;
    return !(typeof original === 'string' && original.startsWith('{'));
  });
}
