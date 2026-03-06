import { join } from 'node:path';
import type { TransformedToken } from 'style-dictionary/types';
import {
  type BuildContext,
  T1_DIRECTORY_NAME,
  normalizeHex,
  writeFileSafe,
} from './context.ts';

const XCASSETS_INFO = { author: 'esds', version: 1 };

const FONT_WEIGHT_MAP: Record<number, string> = {
  100: '.ultraLight',
  200: '.thin',
  300: '.light',
  400: '.regular',
  500: '.medium',
  600: '.semibold',
  700: '.bold',
  800: '.heavy',
  900: '.black',
};

/**
 * Converts a token path to a Swift camelCase property name.
 * e.g. ['color', 'red', '500'] → 'colorRed500'
 * e.g. ['border-width', 'thin'] → 'borderWidthThin'
 */
function toSwiftName(path: string[]): string {
  return path.map((segment, i) => {
    // Remove non-alphanumeric chars (except dashes), then convert dash-case to camelCase
    const cleaned = segment.replace(/[^a-zA-Z0-9-]/g, '');
    const camel = cleaned.replace(/-([a-zA-Z0-9])/g, (_, c: string) => c.toUpperCase());
    if (i === 0) return camel;
    return camel.charAt(0).toUpperCase() + camel.slice(1);
  }).join('');
}

interface SwiftProperty {
  name: string;
  type: string;
  value: string;
  category: string;
}

function tokenToSwiftProperty(token: TransformedToken): SwiftProperty | null {
  const type = token.$type || token.type || '';
  const value = token.$value ?? token.value;
  const original = token.original?.$value;
  const isRef = typeof original === 'string' && original.startsWith('{') && original.endsWith('}');
  const name = toSwiftName(token.path);
  const category = token.path[0] ?? '';

  // Reference → Self.refName
  if (isRef) {
    const refName = toSwiftName(original.slice(1, -1).split('.'));

    switch (type) {
      case 'color':
        return { name, type: 'Color', value: `Self.${refName}`, category };
      case 'dimension':
      case 'number':
        return { name, type: 'CGFloat', value: `Self.${refName}`, category };
      case 'fontFamily':
        return { name, type: 'String', value: `Self.${refName}`, category };
      case 'fontWeight':
        return { name, type: 'Font.Weight', value: `Self.${refName}`, category };
      default:
        return null;
    }
  }

  // Direct value
  switch (type) {
    case 'color': {
      // Palette colors (under 'color' category) → asset catalog reference
      if (category === 'color') {
        const assetName = token.path.slice(1).join('');
        return { name, type: 'Color', value: `Color("${assetName}")`, category };
      }
      // Non-palette colors (e.g. shadow sub-colors) → inline Color from hex
      const hex = normalizeHex(String(value).replace(/^#/, ''));
      const r = parseInt(hex.slice(0, 2), 16) / 255;
      const g = parseInt(hex.slice(2, 4), 16) / 255;
      const b = parseInt(hex.slice(4, 6), 16) / 255;
      const a = hex.length >= 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1.0;
      return { name, type: 'Color', value: `Color(red: ${r.toFixed(3)}, green: ${g.toFixed(3)}, blue: ${b.toFixed(3)}, opacity: ${a.toFixed(3)})`, category };
    }
    case 'dimension': {
      const num = parseFloat(String(value));
      if (isNaN(num)) return null;
      return { name, type: 'CGFloat', value: String(num), category };
    }
    case 'number': {
      const num = typeof value === 'number' ? value : parseFloat(String(value));
      if (isNaN(num)) return null;
      return { name, type: 'CGFloat', value: String(num), category };
    }
    case 'fontFamily':
      return { name, type: 'String', value: `"${String(value)}"`, category };
    case 'fontWeight': {
      const num = typeof value === 'number' ? value : parseInt(String(value), 10);
      const swiftWeight = FONT_WEIGHT_MAP[num];
      if (!swiftWeight) return null;
      return { name, type: 'Font.Weight', value: swiftWeight, category };
    }
    default:
      return null;
  }
}

/**
 * Converts a typography composite token to a Swift property line.
 * Uses references to other EsdsTokens properties.
 */
function typographyToSwiftLines(token: TransformedToken): string[] {
  const name = toSwiftName(token.path);
  const original = token.original?.$value;

  if (!original || typeof original !== 'object') return [];

  const refOrLiteral = (val: unknown, fallbackType: string): string => {
    if (typeof val === 'string' && val.startsWith('{') && val.endsWith('}')) {
      return `EsdsTokens.${toSwiftName(val.slice(1, -1).split('.'))}`;
    }
    if (fallbackType === 'CGFloat') return String(parseFloat(String(val)));
    if (fallbackType === 'String') return `"${String(val)}"`;
    return String(val);
  };

  return [
    `    public static let ${name} = EsdsTypography(`,
    `        fontFamily: ${refOrLiteral(original.fontFamily, 'String')},`,
    `        fontSize: ${refOrLiteral(original.fontSize, 'CGFloat')},`,
    `        fontWeight: ${refOrLiteral(original.fontWeight, 'CGFloat')},`,
    `        lineHeight: ${refOrLiteral(original.lineHeight, 'CGFloat')}`,
    `    )`,
  ];
}

/**
 * Builds Swift/iOS output: XCAssets + EsdsTokens.swift
 */
export async function buildSwift(ctx: BuildContext): Promise<void> {
  console.log('  Building Swift...');

  // 1. XCAssets for T1 palette colors (category 'color' only, not shadow sub-colors)
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

  const xcassetWrites = t1Colors.map((token) => {
    const colorsetName = token.path.slice(1).join('');
    const category = token.path[1];
    const hex = normalizeHex(
      String(token.$value ?? token.value).replace(/^#/, '').toUpperCase(),
    );
    const parts = hex.match(/.{2}/g)!;

    const colorSet = {
      colors: [{
        color: {
          'color-space': 'sRGB',
          components: {
            red: `0x${parts[0]}`,
            green: `0x${parts[1]}`,
            blue: `0x${parts[2]}`,
            alpha: parts[3] !== undefined ? `0x${parts[3]}` : '0xFF',
          },
        },
        idiom: 'universal' as const,
      }],
      info: XCASSETS_INFO,
    };

    return writeFileSafe(
      join(ctx.distDir, `ios/Colors.xcassets/${category}/${colorsetName}.colorset/Contents.json`),
      JSON.stringify(colorSet, null, 2),
    );
  });

  await Promise.all(xcassetWrites);

  // 2. EsdsTokens.swift — all tokens as static properties
  const properties: SwiftProperty[] = [];
  const typographyTokens: TransformedToken[] = [];

  for (const token of ctx.baseTokens) {
    const type = token.$type || token.type || '';
    if (type === 'typography') {
      typographyTokens.push(token);
      continue;
    }
    const prop = tokenToSwiftProperty(token);
    if (prop) properties.push(prop);
  }

  // Group by category (preserving order)
  const categories: string[] = [];
  const seen = new Set<string>();
  for (const prop of properties) {
    if (!seen.has(prop.category)) {
      seen.add(prop.category);
      categories.push(prop.category);
    }
  }

  const lines: string[] = [
    '//',
    '// Do not edit directly, this file was auto-generated.',
    '//',
    '',
    'import SwiftUI',
    '',
  ];

  // Typography struct (only if there are typography tokens)
  if (typographyTokens.length > 0) {
    lines.push(
      'public struct EsdsTypography {',
      '    public let fontFamily: String',
      '    public let fontSize: CGFloat',
      '    public let fontWeight: Font.Weight',
      '    public let lineHeight: CGFloat',
      '}',
      '',
    );
  }

  lines.push('public enum EsdsTokens {');

  for (const cat of categories) {
    const catProps = properties.filter((p) => p.category === cat);
    if (catProps.length === 0) continue;

    const label = cat.charAt(0).toUpperCase() + cat.slice(1).replace(/-([a-z])/g, (_, c: string) => ' ' + c.toUpperCase());
    lines.push('', `    // MARK: - ${label}`, '');

    for (const prop of catProps) {
      lines.push(`    public static let ${prop.name}: ${prop.type} = ${prop.value}`);
    }
  }

  // Typography section
  if (typographyTokens.length > 0) {
    lines.push('', '    // MARK: - Typography', '');
    for (const token of typographyTokens) {
      lines.push(...typographyToSwiftLines(token));
    }
  }

  lines.push('}', '');

  await writeFileSafe(join(ctx.distDir, 'ios/EsdsTokens.swift'), lines.join('\n'));
}
