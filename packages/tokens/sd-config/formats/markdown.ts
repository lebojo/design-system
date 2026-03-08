import type { TransformedToken, FormatFnArguments } from 'style-dictionary/types';
import {
  AUTO_GENERATED_FILE_HEADER,
  CSS_VARIABLE_PREFIX,
  T1_DIRECTORY_NAME,
  T2_DIRECTORY_NAME,
  T3_DIRECTORY_NAME,
  segmentToCssSegment,
} from '../helpers.ts';

const DEFAULT_SAMPLE_TEXT = 'Edelweiss prefers rocky limestone locations';

function normalizeHtml(html: string): string {
  return html.replace(/\n\s*/g, ' ').replace(/\s+/g, ' ').trim();
}

function getTierPrefix(filePath: string): string | undefined {
  const path = filePath.toLowerCase();
  if (path.includes(`/${T1_DIRECTORY_NAME}/`)) return 't1';
  if (path.includes(`/${T2_DIRECTORY_NAME}/`)) return 't2';
  if (path.includes(`/${T3_DIRECTORY_NAME}/`)) return 't3';
  return undefined;
}

function getTokenCategory(path: string[]): string {
  if (path.length === 0) throw new Error('Token path cannot be empty');
  return path[0]!.toLowerCase();
}

function getCssVariable(path: string[]): string {
  const segments = path
    .map(segmentToCssSegment)
    .filter((s: string) => s !== '' && s !== '-')
    .join('-');
  return `--${CSS_VARIABLE_PREFIX}-${segments}`;
}

function getDisplayValue(
  token: TransformedToken,
  valueMap?: Map<string, string>,
): string {
  const type = token.$type || token.type || '';

  // Typography: resolve references to actual values
  if (type === 'typography' && valueMap) {
    return getTypographyDisplayValue(token, valueMap);
  }

  const value = String(token.$value ?? token.value);
  // For references, show the original reference path (without curly braces)
  const original = token.original?.$value;
  if (typeof original === 'string' && original.startsWith('{') && original.endsWith('}')) {
    return original.slice(1, -1);
  }

  // Font family: quote if it contains spaces
  if (type === 'fontFamily') {
    return quoteFontFamily(value);
  }

  return value;
}

function renderColorPreview(token: TransformedToken, cssVariable: string): string {
  const displayValue = getDisplayValue(token);
  return /* HTML */ `
    <div
      style="
      border-radius: 4px;
      width: 100%;
      height: 75px;
      background: var(${cssVariable});
      border: 1px solid #e5e7eb;
    "
    ></div>
    <div
      style="
      margin-top: 4px;
      font-family: monospace;
      font-size: 12px;
      color: #6b7280;
    "
    >
      ${displayValue}
    </div>
  `;
}

function renderDimensionPreview(token: TransformedToken, cssVariable: string): string {
  const displayValue = getDisplayValue(token);
  return /* HTML */ `
    <div
      style="
      background: #dcfce8;
      height: 16px;
      width: var(${cssVariable});
      border-radius: 2px;
      border: 1px solid #86efad;
      position: relative;
    "
    ></div>
    <div
      style="
      margin-top: 4px;
      font-family: monospace;
      font-size: 12px;
      color: #6b7280;
    "
    >
      ${displayValue}
    </div>
  `;
}

function renderRadiusPreview(token: TransformedToken, cssVariable: string): string {
  const displayValue = getDisplayValue(token);
  return /* HTML */ `
    <div
      style="
      width: 100px;
      height: 100px;
      background: #dcfce8;
      border: 2px solid #374151;
      border-radius: var(${cssVariable});
      display: inline-block;
    "
    ></div>
    <div
      style="
      margin-top: 8px;
      font-family: monospace;
      font-size: 12px;
      color: #6b7280;
    "
    >
      ${displayValue}
    </div>
  `;
}

function renderBorderWidthPreview(token: TransformedToken, cssVariable: string): string {
  const displayValue = getDisplayValue(token);
  return /* HTML */ `
    <div
      style="
      width: 50px;
      height: 50px;
      background: #f1f5f9;
      border: var(${cssVariable}) solid #374151;
      display: inline-block;
    "
    ></div>
    <div
      style="
      margin-top: 8px;
      font-family: monospace;
      font-size: 12px;
      color: #6b7280;
    "
    >
      ${displayValue}
    </div>
  `;
}

function renderBreakpointPreview(token: TransformedToken, _cssVariable: string): string {
  const displayValue = getDisplayValue(token);
  return /* HTML */ `
    <div
      style="
      background: #f3f4f6;
      padding: 16px 24px;
      border-radius: 4px;
      border: 1px solid #e5e7eb;
      font-family: monospace;
      font-size: 24px;
      font-weight: 600;
      color: #374151;
      text-align: center;
      display: inline-block;
      min-width: 120px;
    "
    >
      ${displayValue}
    </div>
  `;
}

function renderShadowPreview(token: TransformedToken, cssVariable: string): string {
  const displayValue = getDisplayValue(token);
  return /* HTML */ `
    <div
      style="
      width: 50px;
      height: 50px;
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 4px;
      box-shadow: var(${cssVariable});
      margin: 16px;
    "
    ></div>
    <div
      style="
      font-family: monospace;
      font-size: 11px;
      color: #6b7280;
      max-width: 200px;
      word-wrap: break-word;
    "
    >
      ${displayValue}
    </div>
  `;
}

function renderTypographyPreview(
  token: TransformedToken,
  cssVariable: string,
  valueMap?: Map<string, string>,
): string {
  const displayValue = getDisplayValue(token, valueMap);
  return /* HTML */ `
    <p
      style="
      font: var(${cssVariable});
      margin: 0;
      padding: 12px;
      background: #f9fafb;
      border-radius: 4px;
      border: 1px solid #e5e7eb;
      max-width: 300px;
    "
    >
      ${DEFAULT_SAMPLE_TEXT}
    </p>
    <div
      style="
      margin-top: 4px;
      font-family: monospace;
      font-size: 11px;
      color: #6b7280;
      max-width: 300px;
      word-wrap: break-word;
    "
    >
      ${displayValue}
    </div>
  `;
}

function renderFontFamilyPreview(
  token: TransformedToken,
  cssVariable: string,
  valueMap?: Map<string, string>,
): string {
  const displayValue = getDisplayValue(token, valueMap);
  return /* HTML */ `
    <p
      style="
      font-family: var(${cssVariable});
      font-size: 16px;
      margin: 0;
      padding: 8px;
      background: #f9fafb;
      border-radius: 4px;
      border: 1px solid #e5e7eb;
    "
    >
      ${DEFAULT_SAMPLE_TEXT}
    </p>
    <div
      style="
      margin-top: 4px;
      font-family: monospace;
      font-size: 12px;
      color: #6b7280;
    "
    >
      ${displayValue}
    </div>
  `;
}

function renderFontWeightPreview(token: TransformedToken, cssVariable: string): string {
  const displayValue = getDisplayValue(token);
  return /* HTML */ `
    <p
      style="
      font-weight: var(${cssVariable});
      font-size: 16px;
      font-family: system-ui, sans-serif;
      margin: 0;
      padding: 8px;
      background: #f9fafb;
      border-radius: 4px;
      border: 1px solid #e5e7eb;
    "
    >
      ${DEFAULT_SAMPLE_TEXT}
    </p>
    <div
      style="
      margin-top: 4px;
      font-family: monospace;
      font-size: 12px;
      color: #6b7280;
    "
    >
      ${displayValue}
    </div>
  `;
}

function renderOpacityPreview(token: TransformedToken, cssVariable: string): string {
  const value = token.$value ?? token.value;
  const displayValue = getDisplayValue(token);
  const isRef = typeof token.original?.$value === 'string' && String(token.original.$value).startsWith('{');
  const numValue = typeof value === 'number' ? value : parseFloat(String(value));
  const percentage = Math.round(numValue * 100);

  let inner = '';
  if (!isRef && !isNaN(numValue)) {
    inner = /* HTML */ `
      <div
        style="
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-family: monospace;
        font-size: 14px;
        font-weight: 600;
        color: ${numValue > 0.5 ? '#fff' : '#374151'};
        text-shadow: ${numValue > 0.5 ? '0 1px 2px rgba(0,0,0,0.3)' : 'none'};
        z-index: 10;
      "
      >
        ${percentage}%
      </div>
    `;
  }

  return /* HTML */ `
    <div
      style="
      position: relative;
      width: 100px;
      height: 100px;
      display: inline-block;
      border-radius: 4px;
      overflow: hidden;
      border: 1px solid #e5e7eb;
    "
    >
      <div
        style="
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: #f0f0f0;
        background-image: linear-gradient(45deg, #ccc 25%, transparent 25%),
          linear-gradient(-45deg, #ccc 25%, transparent 25%),
          linear-gradient(45deg, transparent 75%, #ccc 75%),
          linear-gradient(-45deg, transparent 75%, #ccc 75%);
        background-size: 12px 12px;
        background-position: 0 0, 0 6px, 6px -6px, -6px 0px;
      "
      ></div>
      <div
        style="
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: #22c55e;
        opacity: var(${cssVariable});
      "
      ></div>
      ${inner}
    </div>
    <div
      style="
      margin-top: 8px;
      font-family: monospace;
      font-size: 12px;
      color: #6b7280;
    "
    >
      ${displayValue}
    </div>
  `;
}

function renderNumberPreview(token: TransformedToken, _cssVariable: string): string {
  const value = token.$value ?? token.value;
  const displayValue = getDisplayValue(token);
  const category = token.path[0] ?? '';

  // Ratio tokens get a special preview
  if (category === 'ratio' && typeof value === 'number') {
    const baseHeight = 60;
    const width = Math.round(baseHeight * value);
    const lastPart = token.path[token.path.length - 1] ?? '';
    const ratioFormat = lastPart.replace(/-/g, ':');

    return /* HTML */ `
      <div
        style="
        display: inline-block;
        background: #f3f4f6;
        border-radius: 4px;
        border: 2px solid #374151;
        overflow: hidden;
        width: ${width}px;
        height: ${baseHeight}px;
        position: relative;
      "
      >
        <div
          style="
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-family: monospace;
          font-size: 12px;
          color: #374151;
          font-weight: 600;
          text-align: center;
        "
        >
          ${ratioFormat}
        </div>
      </div>
      <div
        style="
        margin-top: 4px;
        font-family: monospace;
        font-size: 12px;
        color: #6b7280;
      "
      >
        ${value}
      </div>
    `;
  }

  return /* HTML */ `
    <div
      style="
      background: #f3f4f6;
      padding: 8px 12px;
      border-radius: 4px;
      border: 1px solid #e5e7eb;
      font-family: monospace;
      font-size: 14px;
      color: #1f2937;
      display: inline-block;
      min-width: 60px;
      text-align: center;
    "
    >
      ${displayValue}
    </div>
  `;
}

function renderGenericPreview(token: TransformedToken, _cssVariable: string): string {
  const displayValue = getDisplayValue(token);
  const type = token.$type || token.type || 'unknown';
  const typeColors: Record<string, string> = {
    duration: '#dbeafe',
    cubicBezier: '#fce7f3',
    strokeStyle: '#fef3c7',
    border: '#e0e7ff',
    gradient: '#ccfbf1',
    transition: '#f3e8ff',
  };
  const backgroundColor = typeColors[type] ?? '#f3f4f6';

  return /* HTML */ `
    <div
      style="
      background: ${backgroundColor};
      padding: 12px;
      border-radius: 4px;
      border: 1px solid #e5e7eb;
      font-family: monospace;
      font-size: 13px;
      color: #374151;
    "
    >
      <div
        style="
        font-weight: 600;
        margin-bottom: 4px;
        color: #4b5563;
      "
      >
        Type: ${type}
      </div>
      <div style="word-wrap: break-word;">${displayValue.length > 80 ? displayValue.slice(0, 77) + '...' : displayValue}</div>
    </div>
    <div
      style="
      margin-top: 4px;
      font-family: monospace;
      font-size: 11px;
      color: #6b7280;
    "
    >
      ${type}
    </div>
  `;
}

function renderTokenPreview(
  token: TransformedToken,
  cssVariable: string,
  valueMap?: Map<string, string>,
): string {
  const type = token.$type || token.type || '';
  const category = token.path[0] ?? '';

  if (type === 'color') return renderColorPreview(token, cssVariable);
  if (type === 'typography') return renderTypographyPreview(token, cssVariable, valueMap);
  if (type === 'fontFamily') return renderFontFamilyPreview(token, cssVariable, valueMap);
  if (type === 'fontWeight') return renderFontWeightPreview(token, cssVariable);
  if (type === 'shadow') return renderShadowPreview(token, cssVariable);

  if (type === 'dimension') {
    if (category === 'radius') return renderRadiusPreview(token, cssVariable);
    if (category === 'border-width') return renderBorderWidthPreview(token, cssVariable);
    if (category === 'breakpoint') return renderBreakpointPreview(token, cssVariable);
    return renderDimensionPreview(token, cssVariable);
  }

  if (type === 'number') {
    if (category === 'opacity') return renderOpacityPreview(token, cssVariable);
    return renderNumberPreview(token, cssVariable);
  }

  return renderGenericPreview(token, cssVariable);
}

interface TokenGroup {
  tierPrefix: string;
  category: string;
  tokens: TransformedToken[];
}

function buildTokenValueMap(tokens: TransformedToken[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const token of tokens) {
    const refPath = token.path.join('.');
    const value = String(token.$value ?? token.value);
    map.set(refPath, value);
  }
  return map;
}

function quoteFontFamily(value: string): string {
  return value.includes(' ') ? `"${value}"` : value;
}

function resolveRef(ref: string, valueMap: Map<string, string>): string {
  if (typeof ref === 'string' && ref.startsWith('{') && ref.endsWith('}')) {
    const path = ref.slice(1, -1);
    return valueMap.get(path) ?? ref;
  }
  return String(ref);
}

function getTypographyDisplayValue(
  token: TransformedToken,
  valueMap: Map<string, string>,
): string {
  const original = token.original?.$value;
  if (!original || typeof original !== 'object') return String(token.$value ?? token.value);

  const fontWeight = resolveRef(original.fontWeight, valueMap);
  const fontSize = resolveRef(original.fontSize, valueMap);
  const lineHeight = resolveRef(original.lineHeight, valueMap);
  const fontFamily = quoteFontFamily(resolveRef(original.fontFamily, valueMap));

  return `${fontWeight} ${fontSize}/${lineHeight} ${fontFamily}`;
}

/**
 * Markdown format - groups tokens by tier+category and generates markdown tables.
 * Returns a Map of filename -> content (used by the build orchestrator).
 */
export function generateMarkdownFiles(tokens: TransformedToken[]): Map<string, string> {
  const valueMap = buildTokenValueMap(tokens);
  const groups = new Map<string, TokenGroup>();

  for (const token of tokens) {
    const tierPrefix = getTierPrefix(token.filePath ?? '');
    if (!tierPrefix) continue;

    // Only include tokens that have a type
    const type = token.$type || token.type;
    if (!type) continue;

    const category = getTokenCategory(token.path);
    const key = `${tierPrefix}-${category}`;

    if (!groups.has(key)) {
      groups.set(key, { tierPrefix, category, tokens: [] });
    }
    groups.get(key)!.tokens.push(token);
  }

  const files = new Map<string, string>();

  for (const [key, group] of groups.entries()) {
    const lines: string[] = [
      '| Preview | Token Name | CSS Variable | Description |',
      '|---------|------------|--------------|-------------|',
    ];

    for (const token of group.tokens) {
      const cssVariable = getCssVariable(token.path);
      const preview = normalizeHtml(renderTokenPreview(token, cssVariable, valueMap));
      const name = token.path.join('.');
      const description = token.$description || token.description || '';

      lines.push(`| ${preview} | \`${name}\` | \`${cssVariable}\` | ${description} |`);
    }

    const content = `<!-- ${AUTO_GENERATED_FILE_HEADER} -->\n\n${lines.join('\n')}`;
    files.set(`${key}.md`, content);
  }

  return files;
}
