import { join } from 'node:path';
import { generateMarkdownFiles } from '../formats/markdown.ts';
import { type BuildContext, writeFileSafe } from './context.ts';

/**
 * Builds Markdown preview files (one per tier/category).
 */
export async function buildMarkdown(ctx: BuildContext): Promise<void> {
  console.log('  Building Markdown tokens...');

  const files = generateMarkdownFiles(ctx.baseTokens);
  const writes = Array.from(files.entries()).map(([filename, content]) =>
    writeFileSafe(join(ctx.distDir, 'markdown', filename), content),
  );

  await Promise.all(writes);
}
