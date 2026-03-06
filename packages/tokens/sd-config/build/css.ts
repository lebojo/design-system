import { join } from 'node:path';
import type { TransformedToken } from 'style-dictionary/types';
import {
  type BuildContext,
  CSS_VARIABLE_PREFIX,
  tokenToCssValue,
  wrapWithSelector,
  writeFileSafe,
} from './context.ts';

/**
 * Builds base CSS files (tokens.root.css + tokens.attr.css).
 * Returns a map of CSS variable name → value for modifier comparison.
 */
export async function buildCss(ctx: BuildContext): Promise<Map<string, string>> {
  console.log('  Writing base CSS...');

  const baseTokenValues = new Map<string, string>();

  const declarations = ctx.baseTokens.map((token: TransformedToken): string => {
    const name = `--${CSS_VARIABLE_PREFIX}-${token.name}`;
    const value = tokenToCssValue(token);
    baseTokenValues.set(name, value);

    const description = token.$description || token.description;
    const deprecated = token.deprecated;

    let output = '';
    if (description || deprecated) {
      output += '/*\n';
      if (description) {
        for (const line of String(description).split('\n')) {
          output += ` * ${line}\n`;
        }
      }
      if (deprecated) {
        output += ` * @deprecated${typeof deprecated === 'string' ? ` ${deprecated}` : ''}\n`;
      }
      output += ' */\n';
    }
    output += `${name}: ${value};`;
    return output;
  });

  const cssVariables = declarations.join('\n');

  await Promise.all([
    writeFileSafe(
      join(ctx.distDir, 'web/css/tokens.root.css'),
      wrapWithSelector(cssVariables, ':root,\n:host'),
    ),
    writeFileSafe(
      join(ctx.distDir, 'web/css/tokens.attr.css'),
      wrapWithSelector(cssVariables, '[data-esds-tokens]'),
    ),
  ]);

  return baseTokenValues;
}
