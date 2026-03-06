import { rm } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import StyleDictionary from 'style-dictionary';

import { type BuildContext, registerHooks, collectTokens, DESIGN_TOKEN_TIERS } from './build/context.ts';
import { buildCss } from './build/css.ts';
import { buildCssModifiers } from './build/css-modifiers.ts';
import { buildTailwind } from './build/tailwind.ts';
import { buildFigma } from './build/figma.ts';
import { buildKotlin } from './build/kotlin.ts';
import { buildSwift } from './build/swift.ts';
import { buildMarkdown } from './build/markdown.ts';
import { buildPackage } from './build/package.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..');
const TOKENS_DIR = join(ROOT_DIR, 'tokens');
const DIST_DIR = join(ROOT_DIR, 'dist-sd');

async function main(): Promise<void> {
  console.log('Building tokens with Style Dictionary V5...');

  await rm(DIST_DIR, { force: true, recursive: true });

  registerHooks(StyleDictionary);

  const baseSources = DESIGN_TOKEN_TIERS.map(
    (tier) => `${TOKENS_DIR}/${tier}/**/*.tokens.json`,
  );

  console.log('  Collecting base tokens...');
  const baseTokens = await collectTokens(baseSources);

  const ctx: BuildContext = {
    tokensDir: TOKENS_DIR,
    distDir: DIST_DIR,
    rootDir: ROOT_DIR,
    baseSources,
    baseTokens,
  };

  // Build all outputs
  const baseTokenValues = await buildCss(ctx);
  await buildCssModifiers(ctx, baseTokenValues);
  await buildTailwind(ctx);
  await buildFigma(ctx);
  await Promise.all([
    buildKotlin(ctx),
    buildSwift(ctx),
    buildMarkdown(ctx),
  ]);
  await buildPackage(ctx);

  console.log('Done!');
}

main().catch((err: unknown) => {
  console.error('Build failed:', err);
  process.exit(1);
});
