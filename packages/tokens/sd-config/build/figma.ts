import { join } from 'node:path';
import type { TransformedToken } from 'style-dictionary/types';
import { buildFigmaTokens } from '../formats/figma.ts';
import {
  type BuildContext,
  collectTokens,
  listTokenFiles,
  writeFileSafe,
} from './context.ts';

/**
 * Builds the Figma tokens JSON file.
 */
export async function buildFigma(ctx: BuildContext): Promise<void> {
  console.log('  Building Figma tokens...');

  const themeTokenSets = new Map<string, TransformedToken[]>();
  const themeModifierPath = join(ctx.tokensDir, 'modifiers/theme');
  const themeFiles = await listTokenFiles(themeModifierPath);

  for (const themeFile of themeFiles) {
    const themeName = themeFile.replace('.tokens.json', '');
    const themeSources = [...ctx.baseSources, join(themeModifierPath, themeFile)];
    const themeTokens = await collectTokens(themeSources);
    themeTokenSets.set(themeName, themeTokens);
  }

  const figmaJson = buildFigmaTokens(ctx.baseTokens, themeTokenSets);
  await writeFileSafe(join(ctx.distDir, 'figma.tokens.json'), figmaJson);
}
