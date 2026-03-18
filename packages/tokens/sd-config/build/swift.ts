import { join } from 'node:path';
import type { TransformedToken } from 'style-dictionary/types';
import {
  type BuildContext,
  T1_DIRECTORY_NAME,
  T2_DIRECTORY_NAME,
  T3_DIRECTORY_NAME,
  normalizeHex,
  writeFileSafe,
  collectTokens,
  listTokenFiles,
} from './context.ts';

const XCASSETS_INFO = { author: 'esds', version: 1 };

const FONT_WEIGHT_MAP: Record<number, string> = {
  100: '.ultraLight', 200: '.thin', 300: '.light', 400: '.regular', 500: '.medium',
  600: '.semibold', 700: '.bold', 800: '.heavy', 900: '.black',
};

/** Maps DTCG token type → Swift type string. */
const TYPE_SWIFT_MAP: Record<string, string> = {
  color: 'Color', dimension: 'CGFloat', number: 'CGFloat',
  fontFamily: 'String', fontWeight: 'Font.Weight',
};

const PRODUCTS = [
  'infomaniak', 'mail', 'kdrive', 'euria', 'kchat',
  'security', 'calendar', 'contacts', 'knote', 'swisstransfer',
] as const;

type Product = (typeof PRODUCTS)[number];

// ---------------------------------------------------------------------------
// Naming helpers
// ---------------------------------------------------------------------------

/** Strips non-alphanumeric chars and converts kebab-case → camelCase. */
function cleanSegment(s: string): string {
  return s.replace(/[^a-zA-Z0-9-]/g, '').replace(/-([a-zA-Z0-9])/g, (_, c: string) => c.toUpperCase());
}

/** Path → Swift camelCase id, e.g. ['color', 'red', '500'] → 'colorRed500' */
function toSwiftName(path: string[]): string {
  return path
    .map((s, i) => { const c = cleanSegment(s); return i === 0 ? c : c.charAt(0).toUpperCase() + c.slice(1); })
    .join('');
}

/** Single segment → camelCase property name. Prefixes leading digit with '_'. */
function toPropertyName(segment: string): string {
  const c = cleanSegment(segment);
  return /^\d/.test(c) ? `_${c}` : c;
}

/** Path prefix → PascalCase struct name, e.g. ['EsdsTheme','color','bg'] → 'EsdsThemeColorBg' */
function toStructName(prefix: string[]): string {
  return prefix
    .map((s, i) => { const c = cleanSegment(s); return i === 0 || /^\d/.test(c) ? c : c.charAt(0).toUpperCase() + c.slice(1); })
    .join('');
}

// ---------------------------------------------------------------------------
// EsdsTokens.swift — flat enum of all token values
// ---------------------------------------------------------------------------

interface SwiftProperty {
  name: string;
  type: string;
  value: string;
  category: string;
}

function isT1Token(token: TransformedToken): boolean {
  return (token.filePath ?? '').includes(T1_DIRECTORY_NAME);
}

function isT2Token(token: TransformedToken): boolean {
  return (token.filePath ?? '').includes(T2_DIRECTORY_NAME);
}

function isTokenReference(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith('{') && value.endsWith('}');
}

function colorLiteralFromToken(token: TransformedToken): string {
  if (token.path[0] === 'color' && isT1Token(token)) {
    return `Color("${token.path.slice(1).join('')}")`;
  }
  const hex = normalizeHex(String(token.$value ?? token.value).replace(/^#/, ''));
  const [r, g, b] = [0, 2, 4].map((o) => (parseInt(hex.slice(o, o + 2), 16) / 255).toFixed(3));
  const a = hex.length >= 8 ? (parseInt(hex.slice(6, 8), 16) / 255).toFixed(3) : '1.000';
  return `Color(red: ${r}, green: ${g}, blue: ${b}, opacity: ${a})`;
}

function resolveColorExpression(
  token: TransformedToken,
  bySwiftName: Map<string, TransformedToken>,
  depth = 0,
): string {
  if (depth > 10) return colorLiteralFromToken(token);

  const original = token.original?.$value;
  if (!isTokenReference(original)) return colorLiteralFromToken(token);

  const refPath = original.slice(1, -1).split('.');
  const refName = toSwiftName(refPath);
  const refToken = bySwiftName.get(refName);

  if (refToken) {
    if (isT2Token(refToken)) return `Self.${refName}`;
    return resolveColorExpression(refToken, bySwiftName, depth + 1);
  }

  if (refPath[0] === 'color') return `Color("${refPath.slice(1).join('')}")`;
  return `Self.${refName}`;
}

function tokenToSwiftProperty(
  token: TransformedToken,
  lightBySwiftName: Map<string, TransformedToken>,
  darkBySwiftName: Map<string, TransformedToken>,
): SwiftProperty | null {
  if (!isT2Token(token)) return null;

  const type = token.$type || token.type || '';
  const swiftType = TYPE_SWIFT_MAP[type];
  if (!swiftType) return null;

  const value = token.$value ?? token.value;
  const name = toSwiftName(token.path);
  const category = token.path[0] ?? '';

  // Direct value
  switch (type) {
    case 'color': {
      const darkToken = darkBySwiftName.get(name);
      const lightExpr = resolveColorExpression(token, lightBySwiftName);
      const darkExpr = darkToken ? resolveColorExpression(darkToken, darkBySwiftName) : lightExpr;
      const colorValue = lightExpr === darkExpr ? lightExpr : `Color(light: ${lightExpr}, dark: ${darkExpr})`;
      return { name, type: 'Color', value: colorValue, category };
    }
    case 'dimension':
    case 'number': {
      const num = typeof value === 'number' ? value : parseFloat(String(value));
      return isNaN(num) ? null : { name, type: 'CGFloat', value: String(num), category };
    }
    case 'fontFamily':
      return { name, type: 'String', value: `"${String(value)}"`, category };
    case 'fontWeight': {
      const num = typeof value === 'number' ? value : parseInt(String(value), 10);
      const w = FONT_WEIGHT_MAP[num];
      return w ? { name, type: 'Font.Weight', value: w, category } : null;
    }
    default: return null;
  }
}

function typographyToSwiftLines(token: TransformedToken): string[] {
  const typography = token.$value ?? token.value;
  if (!typography || typeof typography !== 'object') return [];

  const value = typography as {
    fontFamily?: unknown;
    fontSize?: unknown;
    fontWeight?: unknown;
    lineHeight?: unknown;
  };

  const fontFamily = `"${String(value.fontFamily ?? '')}"`;
  const fontSize = String(parseFloat(String(value.fontSize ?? 0)));
  const fontWeightNum = typeof value.fontWeight === 'number'
    ? value.fontWeight
    : parseInt(String(value.fontWeight ?? 400), 10);
  const fontWeight = FONT_WEIGHT_MAP[fontWeightNum] ?? '.regular';
  const lineHeight = String(parseFloat(String(value.lineHeight ?? 0)));

  const name = toSwiftName(token.path);
  return [
    `    public static let ${name} = EsdsTypography(`,
    `        fontFamily: ${fontFamily},`,
    `        fontSize: ${fontSize},`,
    `        fontWeight: ${fontWeight},`,
    `        lineHeight: ${lineHeight}`,
    `    )`,
  ];
}

// ---------------------------------------------------------------------------
// Token tree — builds a nested structure mirroring the token path hierarchy
// ---------------------------------------------------------------------------

interface TokenLeaf {
  kind: 'leaf';
  token: TransformedToken;
  value: string;
  swiftType: string;
}

interface TokenBranch {
  kind: 'branch';
  children: Map<string, TokenNode>;
}

type TokenNode = TokenLeaf | TokenBranch;

function indexByName(tokens: TransformedToken[]): Map<string, TransformedToken> {
  return new Map(tokens.map(t => [t.name, t]));
}

function indexBySwiftName(map: Map<string, TransformedToken>): Map<string, TransformedToken> {
  return new Map([...map.values()].map(t => [toSwiftName(t.path), t]));
}

function isSemanticOrComponent(token: TransformedToken): boolean {
  const fp = token.filePath ?? '';
  return fp.includes(T2_DIRECTORY_NAME) || fp.includes(T3_DIRECTORY_NAME) || fp.includes('modifiers');
}

function resolvedEsdsRef(
  token: TransformedToken,
  bySwiftName: Map<string, TransformedToken>,
  depth = 0,
): string {
  if (depth > 10) return `EsdsTokens.${toSwiftName(token.path)}`;
  if (isT2Token(token)) return `EsdsTokens.${toSwiftName(token.path)}`;

  const orig = token.original?.$value;
  if (isTokenReference(orig)) {
    const name = toSwiftName(orig.slice(1, -1).split('.'));
    const ref = bySwiftName.get(name);
    if (ref) return resolvedEsdsRef(ref, bySwiftName, depth + 1);
    if (orig.startsWith('{color.')) {
      const path = orig.slice(1, -1).split('.');
      return `Color("${path.slice(1).join('')}")`;
    }
    return `EsdsTokens.${name}`;
  }

  if ((token.$type || token.type) === 'color' && token.path[0] === 'color') {
    return `Color("${token.path.slice(1).join('')}")`;
  }

  return `EsdsTokens.${toSwiftName(token.path)}`;
}

function resolveColorValue(
  lightToken: TransformedToken,
  darkToken: TransformedToken | undefined,
  lightByName: Map<string, TransformedToken>,
  darkByName: Map<string, TransformedToken>,
): string {
  if (!darkToken || lightToken.original?.$value === darkToken.original?.$value)
    return resolvedEsdsRef(lightToken, lightByName);
  const l = resolvedEsdsRef(lightToken, lightByName);
  const d = resolvedEsdsRef(darkToken, darkByName);
  return l === d ? l : `Color(light: ${l}, dark: ${d})`;
}

function getOrCreateBranch(map: Map<string, TokenNode>, key: string): TokenBranch | null {
  const existing = map.get(key);
  if (!existing) {
    const branch: TokenBranch = { kind: 'branch', children: new Map() };
    map.set(key, branch);
    return branch;
  }
  return existing.kind === 'branch' ? existing : null;
}

function buildTokenTree(
  lightTokens: Map<string, TransformedToken>,
  darkTokens: Map<string, TransformedToken>,
  baseTokens: TransformedToken[],
): Map<string, TokenNode> {
  const root = new Map<string, TokenNode>();
  const lightBySwiftName = indexBySwiftName(lightTokens);
  const darkBySwiftName = indexBySwiftName(darkTokens);

  for (const token of baseTokens) {
    if (!isSemanticOrComponent(token)) continue;
    const type = token.$type || token.type || '';
    const swiftType = TYPE_SWIFT_MAP[type];
    if (!swiftType || type === 'typography') continue;

    const lightToken = lightTokens.get(token.name) ?? token;
    const darkToken = darkTokens.get(token.name);
    const value = type === 'color'
      ? resolveColorValue(lightToken, darkToken, lightBySwiftName, darkBySwiftName)
      : resolvedEsdsRef(lightToken, lightBySwiftName);

    const { path } = token;
    if (path.length === 0) continue;

    let current = root;
    for (let i = 0; i < path.length - 1; i++) {
      const branch = getOrCreateBranch(current, path[i]);
      if (!branch) break;
      current = branch.children;
    }
    const lastKey = path[path.length - 1];
    if (!current.has(lastKey)) current.set(lastKey, { kind: 'leaf', token, value, swiftType });
  }

  return root;
}

/**
 * Returns the subset of `product` nodes whose values differ from `base`.
 * Returns null when there are no differences (product === base for this subtree).
 */
function diffTree(
  base: Map<string, TokenNode>,
  product: Map<string, TokenNode>,
): Map<string, TokenNode> | null {
  const diff = new Map<string, TokenNode>();
  for (const [key, productNode] of product) {
    const baseNode = base.get(key);
    if (productNode.kind === 'leaf') {
      if (!baseNode || baseNode.kind !== 'leaf' || baseNode.value !== productNode.value)
        diff.set(key, productNode);
    } else {
      const baseChildren = baseNode?.kind === 'branch' ? baseNode.children : new Map<string, TokenNode>();
      const childDiff = diffTree(baseChildren, productNode.children);
      if (childDiff !== null) diff.set(key, { kind: 'branch', children: childDiff });
    }
  }
  return diff.size > 0 ? diff : null;
}

// ---------------------------------------------------------------------------
// Struct emission — walks the tree and emits nested Swift structs
// ---------------------------------------------------------------------------

const STATE_KEYS = new Set(['default', 'hover', 'pressed']);
const INLINE_TYPES = new Set(['CGFloat', 'String', 'Font.Weight']);

function isStateColorBranch(node: TokenBranch): boolean {
  let hasState = false;
  for (const [k, child] of node.children) {
    if (STATE_KEYS.has(k)) hasState = true;
    if (child.kind !== 'leaf' || child.swiftType !== 'Color') return false;
  }
  return hasState && node.children.size <= 3;
}

function isInlineLeafBranch(node: TokenBranch): boolean {
  for (const child of node.children.values()) {
    if (child.kind !== 'leaf' || !INLINE_TYPES.has(child.swiftType)) return false;
  }
  return node.children.size > 0;
}

/** Builds the `EsdsStateColors(default:hover:pressed:)` init expression for a state-color branch. */
function stateColorsInit(node: TokenBranch): string {
  const get = (k: string) => (node.children.get(k) as TokenLeaf | undefined)?.value ?? '.clear';
  return `EsdsStateColors(default: ${get('default')}, hover: ${get('hover')}, pressed: ${get('pressed')})`;
}

/**
 * Recursively emits Swift struct definitions for the given tree node.
 * Deepest structs are pushed first; the struct for `prefixParts` is pushed last.
 * @param out accumulator of line arrays, one per struct
 */
function emitStructs(node: Map<string, TokenNode>, prefixParts: string[], out: string[][]): void {
  const fields: string[] = [];
  const initParams: string[] = [];
  const initAssigns: string[] = [];
  const seen = new Set<string>();

  const addProp = (name: string, type: string, defaultVal: string) => {
    fields.push(`    public let ${name}: ${type}`);
    initParams.push(`        ${name}: ${type} = ${defaultVal}`);
    initAssigns.push(`        self.${name} = ${name}`);
  };

  for (const [key, child] of node) {
    const propName = toPropertyName(key);
    if (seen.has(propName)) continue;
    seen.add(propName);

    if (child.kind === 'leaf') {
      addProp(propName, child.swiftType, child.value);
    } else if (isStateColorBranch(child)) {
      addProp(propName, 'EsdsStateColors', stateColorsInit(child));
    } else if (isInlineLeafBranch(child)) {
      for (const [subKey, subChild] of child.children) {
        if (subChild.kind !== 'leaf') continue;
        const sub = toPropertyName(`${key}-${subKey}`);
        if (seen.has(sub)) continue;
        seen.add(sub);
        addProp(sub, subChild.swiftType, subChild.value);
      }
    } else {
      const childPrefix = [...prefixParts, key];
      emitStructs(child.children, childPrefix, out);
      const childStruct = toStructName(childPrefix);
      addProp(propName, childStruct, `${childStruct}()`);
    }
  }

  if (fields.length === 0) return;

  const structName = toStructName(prefixParts);
  out.push([
    `// MARK: - ${structName}`,
    '',
    `public struct ${structName}: Sendable {`,
    ...fields,
    '',
    '    public init(',
    ...initParams.map((p, i) => (i < initParams.length - 1 ? `${p},` : p)),
    '    ) {',
    ...initAssigns,
    '    }',
    '}',
    '',
  ]);
}

/**
 * Renders `EsdsTheme(...)` for a product theme from a (possibly partial diff) tree.
 * Top-level categories are always forced into their own struct init, matching emitStructs.
 * Missing categories use EsdsTheme's default parameter values.
 */
/**
 * Renders `EsdsTheme(...)` for a product theme from a (possibly partial diff) tree.
 * Top-level categories are always forced into their own struct init, matching emitStructs.
 * Missing categories use EsdsTheme's default parameter values.
 * `base` is the full base tree, used to resolve struct types (not diffed values).
 */
function renderProductThemeInit(tree: Map<string, TokenNode>, indent: string, base: Map<string, TokenNode>): string[] {
  const lines = [`${indent}EsdsTheme(`];
  const entries = [...tree.entries()].filter((e): e is [string, TokenBranch] => e[1].kind === 'branch');
  entries.forEach(([key, child], idx) => {
    const propName = toPropertyName(key);
    const comma = idx === entries.length - 1 ? '' : ',';
    const baseBranch = base.get(key);
    const baseChildCtx = baseBranch?.kind === 'branch' ? baseBranch.children : undefined;
    const childLines = renderTreeInit(child.children, ['EsdsTheme', key], `${indent}    `, baseChildCtx);
    childLines[childLines.length - 1] += comma;
    lines.push(`${indent}    ${propName}:`);
    lines.push(...childLines);
  });
  lines.push(`${indent})`);
  return lines;
}

/**
 * Renders a struct instantiation expression for a tree node.
 * `baseContext` is the corresponding base tree level, used for type-checking branches
 * (e.g. to distinguish partial diffs from genuine EsdsStateColors branches).
 */
function renderTreeInit(
  node: Map<string, TokenNode>,
  structNameParts: string[],
  indent: string,
  baseContext?: Map<string, TokenNode>,
): string[] {
  const lines: string[] = [`${indent}${toStructName(structNameParts)}(`];
  const entries = [...node.entries()];
  const seen = new Set<string>();

  entries.forEach(([key, child], idx) => {
    const propName = toPropertyName(key);
    if (seen.has(propName)) return;
    seen.add(propName);
    const comma = idx === entries.length - 1 ? '' : ',';

    if (child.kind === 'leaf') {
      lines.push(`${indent}    ${propName}: ${child.value}${comma}`);
    } else {
      // Use the base tree node for type determination — avoids misidentifying partial
      // diffs (e.g. brand.{default,hover,pressed}) as EsdsStateColors.
      const baseChild = baseContext?.get(key);
      const typeRef = baseChild?.kind === 'branch' ? baseChild : child;
      const baseChildCtx = baseChild?.kind === 'branch' ? baseChild.children : undefined;

      if (isStateColorBranch(typeRef)) {
        lines.push(`${indent}    ${propName}: ${stateColorsInit(child)}${comma}`);
      } else if (isInlineLeafBranch(typeRef)) {
        for (const [subKey, subChild] of child.children) {
          if (subChild.kind !== 'leaf') continue;
          const sub = toPropertyName(`${key}-${subKey}`);
          if (seen.has(sub)) continue;
          seen.add(sub);
          lines.push(`${indent}    ${sub}: ${subChild.value},`);
        }
      } else {
        const childLines = renderTreeInit(child.children, [...structNameParts, key], `${indent}    `, baseChildCtx);
        childLines[childLines.length - 1] += comma;
        lines.push(`${indent}    ${propName}:`);
        lines.push(...childLines);
      }
    }
  });

  lines.push(`${indent})`);
  return lines;
}

// ---------------------------------------------------------------------------
// Top-level builders
// ---------------------------------------------------------------------------

async function buildSwiftThemes(ctx: BuildContext, distDir: string): Promise<void> {
  const themePath = join(ctx.tokensDir, 'modifiers', 'theme');
  const productPath = join(ctx.tokensDir, 'modifiers', 'product');
  const darkSource = join(themePath, 'dark.tokens.json');

  const baseDarkTokens = await collectTokens([...ctx.baseSources, darkSource]);
  const tree = buildTokenTree(indexByName(ctx.baseTokens), indexByName(baseDarkTokens), ctx.baseTokens);
  await writeSwiftThemeFile(distDir, tree);

  const productFiles = await listTokenFiles(productPath);
  const productThemes: Array<{ product: string; tree: Map<string, TokenNode> }> = [];

  for (const productFile of productFiles) {
    const product = productFile.replace('.tokens.json', '') as Product;
    if (!(PRODUCTS as readonly string[]).includes(product)) continue;

    const productSource = join(productPath, productFile);
    const [productLightTokens, productDarkTokens] = await Promise.all([
      collectTokens([...ctx.baseSources, productSource]),
      collectTokens([...ctx.baseSources, darkSource, productSource]),
    ]);
    productThemes.push({
      product,
      tree: buildTokenTree(indexByName(productLightTokens), indexByName(productDarkTokens), productLightTokens),
    });
  }

  await writeSwiftProductThemesFile(distDir, productThemes, tree);
}

async function writeSwiftThemeFile(distDir: string, tree: Map<string, TokenNode>): Promise<void> {
  const structs: string[][] = [];
  const rootFields: string[] = [];
  const rootInitParams: string[] = [];
  const rootInitAssigns: string[] = [];

  // Force each top-level category (color, font, radius, …) into its own struct,
  // bypassing isInlineLeafBranch which would otherwise flatten uniform-CGFloat categories.
  for (const [key, child] of tree) {
    if (child.kind !== 'branch') continue;
    const propName = toPropertyName(key);
    const childStruct = toStructName(['EsdsTheme', key]);
    emitStructs(child.children, ['EsdsTheme', key], structs);
    rootFields.push(`    public let ${propName}: ${childStruct}`);
    rootInitParams.push(`        ${propName}: ${childStruct} = ${childStruct}()`);
    rootInitAssigns.push(`        self.${propName} = ${propName}`);
  }

  structs.push([
    '// MARK: - EsdsTheme',
    '',
    'public struct EsdsTheme: Sendable {',
    ...rootFields,
    '',
    '    public init(',
    ...rootInitParams.map((p, i) => (i < rootInitParams.length - 1 ? `${p},` : p)),
    '    ) {',
    ...rootInitAssigns,
    '    }',
    '}',
    '',
  ]);

  const lines = [
    '//',
    '// Do not edit directly, this file was auto-generated.',
    '//',
    '',
    'import SwiftUI',
    '',
    '// MARK: - Color(light:dark:) helper',
    '',
    'extension Color {',
    '    init(light: Color, dark: Color) {',
    '        self.init(UIColor { traits in',
    '            traits.userInterfaceStyle == .dark ? UIColor(dark) : UIColor(light)',
    '        })',
    '    }',
    '}',
    '',
    '// MARK: - EsdsStateColors',
    '',
    'public struct EsdsStateColors: Sendable {',
    '    public let `default`: Color',
    '    public let hover: Color',
    '    public let pressed: Color',
    '',
    '    public init(`default`: Color = .clear, hover: Color = .clear, pressed: Color = .clear) {',
    '        self.default = `default`',
    '        self.hover = hover',
    '        self.pressed = pressed',
    '    }',
    '}',
    '',
    ...structs.flat(),
  ];

  await writeFileSafe(join(distDir, 'ios/EsdsTheme.swift'), lines.join('\n'));
}

async function writeSwiftProductThemesFile(
  distDir: string,
  productThemes: Array<{ product: string; tree: Map<string, TokenNode> }>,
  baseTree: Map<string, TokenNode>,
): Promise<void> {
  if (productThemes.length === 0) return;

  const lines: string[] = [
    '//',
    '// Do not edit directly, this file was auto-generated.',
    '//',
    '',
    'import SwiftUI',
    '',
    '// MARK: - EsdsProductTheme',
    '',
    'public struct EsdsProductTheme: Equatable, Sendable {',
    '    public let name: String',
    '    public let tokens: EsdsTheme',
    '',
    '    public static func == (lhs: EsdsProductTheme, rhs: EsdsProductTheme) -> Bool {',
    '        lhs.name == rhs.name',
    '    }',
    '',
    '    // MARK: - Products',
    '',
  ];

  for (const { product, tree } of productThemes) {
    const diff = diffTree(baseTree, tree);
    const tokenInit = diff ? renderProductThemeInit(diff, '        ', baseTree) : ['        EsdsTheme()'];
    lines.push(
      `    public static let ${product} = EsdsProductTheme(`,
      `        name: "${product}",`,
      `        tokens:`,
      ...tokenInit,
      '    )',
      '',
    );
  }

  const allCasesList = productThemes.map(({ product }) => `.${product}`).join(', ');
  lines.push(
    `    public static let allCases: [EsdsProductTheme] = [${allCasesList}]`,
    '}',
    '',
    '// MARK: - SwiftUI Environment',
    '',
    'private struct EsdsProductThemeKey: EnvironmentKey {',
    '    static let defaultValue: EsdsProductTheme = .infomaniak',
    '}',
    '',
    'public extension EnvironmentValues {',
    '    var esdsProductTheme: EsdsProductTheme {',
    '        get { self[EsdsProductThemeKey.self] }',
    '        set { self[EsdsProductThemeKey.self] = newValue }',
    '    }',
    '}',
    '',
    'public extension View {',
    '    func esdsProductTheme(_ theme: EsdsProductTheme) -> some View {',
    '        environment(\\.esdsProductTheme, theme)',
    '    }',
    '}',
    '',
  );

  await writeFileSafe(join(distDir, 'ios/EsdsProductTheme.swift'), lines.join('\n'));
}

export async function buildSwift(ctx: BuildContext): Promise<void> {
  console.log('  Building Swift...');

  // 1. XCAssets for T1 palette colors
  const t1Colors = ctx.baseTokens.filter((t) => {
    if (t.path[0] !== 'color') return false;
    const type = t.$type || t.type;
    if (type !== 'color') return false;
    if (!(t.filePath ?? '').includes(T1_DIRECTORY_NAME)) return false;
    const orig = t.original?.$value;
    return !(typeof orig === 'string' && orig.startsWith('{'));
  });

  await writeFileSafe(
    join(ctx.distDir, 'ios/Colors.xcassets/Contents.json'),
    JSON.stringify({ info: XCASSETS_INFO }, null, 2),
  );

  await Promise.all(t1Colors.map((token) => {
    const colorsetName = token.path.slice(1).join('');
    const category = token.path[1];
    const hex = normalizeHex(String(token.$value ?? token.value).replace(/^#/, '').toUpperCase());
    const parts = hex.match(/.{2}/g)!;
    return writeFileSafe(
      join(ctx.distDir, `ios/Colors.xcassets/${category}/${colorsetName}.colorset/Contents.json`),
      JSON.stringify({
        colors: [{
          color: {
            'color-space': 'sRGB',
            components: {
              red: `0x${parts[0]}`, green: `0x${parts[1]}`,
              blue: `0x${parts[2]}`, alpha: parts[3] !== undefined ? `0x${parts[3]}` : '0xFF',
            },
          },
          idiom: 'universal' as const,
        }],
        info: XCASSETS_INFO,
      }, null, 2),
    );
  }));

  // 2. EsdsTokens.swift — only T2 tokens as static properties
  const darkSource = join(ctx.tokensDir, 'modifiers', 'theme', 'dark.tokens.json');
  const darkTokens = await collectTokens([...ctx.baseSources, darkSource]);
  const lightBySwiftName = indexBySwiftName(indexByName(ctx.baseTokens));
  const darkBySwiftName = indexBySwiftName(indexByName(darkTokens));

  const properties: SwiftProperty[] = [];
  const typographyTokens: TransformedToken[] = [];

  for (const token of ctx.baseTokens) {
    if (!isT2Token(token)) continue;
    const type = token.$type || token.type || '';
    if (type === 'typography') { typographyTokens.push(token); continue; }
    const prop = tokenToSwiftProperty(token, lightBySwiftName, darkBySwiftName);
    if (prop) properties.push(prop);
  }

  const seenCats = new Set<string>();
  const categories = properties.reduce<string[]>((acc, p) => {
    if (!seenCats.has(p.category)) { seenCats.add(p.category); acc.push(p.category); }
    return acc;
  }, []);

  const lines: string[] = ['//', '// Do not edit directly, this file was auto-generated.', '//', '', 'import SwiftUI', ''];

  if (typographyTokens.length > 0) {
    lines.push(
      'public struct EsdsTypography {',
      '    public let fontFamily: String',
      '    public let fontSize: CGFloat',
      '    public let fontWeight: Font.Weight',
      '    public let lineHeight: CGFloat',
      '}', '',
    );
  }

  lines.push('public enum EsdsTokens {');
  for (const cat of categories) {
    const label = cat.charAt(0).toUpperCase() + cat.slice(1).replace(/-([a-z])/g, (_, c: string) => ' ' + c.toUpperCase());
    lines.push('', `    // MARK: - ${label}`, '');
    for (const prop of properties.filter(p => p.category === cat))
      lines.push(`    public static let ${prop.name}: ${prop.type} = ${prop.value}`);
  }

  if (typographyTokens.length > 0) {
    lines.push('', '    // MARK: - Typography', '');
    for (const token of typographyTokens) lines.push(...typographyToSwiftLines(token));
  }

  lines.push('}', '');
  await writeFileSafe(join(ctx.distDir, 'ios/EsdsTokens.swift'), lines.join('\n'));

  // 3. EsdsTheme.swift + EsdsProductTheme.swift — adaptive nested-struct themes
  await buildSwiftThemes(ctx, ctx.distDir);
}
