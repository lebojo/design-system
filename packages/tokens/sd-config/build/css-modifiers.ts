import { join } from 'node:path';
import type { TransformedToken } from 'style-dictionary/types';
import {
  type BuildContext,
  CSS_VARIABLE_PREFIX,
  tokenToCssValue,
  wrapWithSelector,
  writeFileSafe,
  collectTokens,
  listTokenFiles,
} from './context.ts';

/**
 * Builds modifier CSS files (themes and products).
 */
export async function buildCssModifiers(
  ctx: BuildContext,
  baseTokenValues: Map<string, string>,
): Promise<void> {
  console.log('  Building modifier CSS...');

  for (const modifierDir of ['theme', 'product']) {
    const modifierPath = join(ctx.tokensDir, 'modifiers', modifierDir);
    const contextFiles = await listTokenFiles(modifierPath);

    for (const contextFile of contextFiles) {
      const contextName = contextFile.replace('.tokens.json', '');
      console.log(`    Modifier: ${modifierDir}/${contextName}`);

      const modifierSources = [
        ...ctx.baseSources,
        join(modifierPath, contextFile),
      ];
      const modifierTokens = await collectTokens(modifierSources);

      // Find tokens directly modified by the modifier file
      const modifiedDeclarations: string[] = [];
      const modifiedNames = new Set<string>();

      for (const token of modifierTokens) {
        const name = `--${CSS_VARIABLE_PREFIX}-${token.name}`;
        const value = tokenToCssValue(token);
        const baseValue = baseTokenValues.get(name);
        const isFromModifier = (token.filePath ?? '').includes(`modifiers/${modifierDir}/${contextName}`);

        if (isFromModifier && baseValue !== undefined) {
          modifiedDeclarations.push(`${name}: ${value};`);
          modifiedNames.add(token.name);
        }
      }

      // Find redeclared tokens (tokens that reference modified tokens)
      const redeclaredDeclarations: string[] = [];
      for (const token of modifierTokens) {
        if (modifiedNames.has(token.name)) continue;

        const value = tokenToCssValue(token);
        for (const modName of modifiedNames) {
          if (value.includes(`var(--${CSS_VARIABLE_PREFIX}-${modName})`)) {
            const name = `--${CSS_VARIABLE_PREFIX}-${token.name}`;
            redeclaredDeclarations.push(`${name}: ${value};`);
            break;
          }
        }
      }

      let cssVariables = modifiedDeclarations.join('\n');
      if (redeclaredDeclarations.length > 0) {
        cssVariables += `\n/* REDECLARED */\n${redeclaredDeclarations.join('\n')}`;
      }

      if (cssVariables.length > 0) {
        const outputDir = join(ctx.distDir, 'web/css/modifiers', modifierDir);
        await Promise.all([
          writeFileSafe(
            join(outputDir, `${contextName}.root.css`),
            wrapWithSelector(cssVariables, ':root,\n:host'),
          ),
          writeFileSafe(
            join(outputDir, `${contextName}.attr.css`),
            wrapWithSelector(cssVariables, `[data-esds-${modifierDir}="${contextName}"]`),
          ),
        ]);
      }
    }
  }
}
