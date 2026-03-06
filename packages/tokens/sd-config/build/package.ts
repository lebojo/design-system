import { readFile, copyFile } from 'node:fs/promises';
import { join } from 'node:path';
import { type BuildContext, writeFileSafe } from './context.ts';

/**
 * Generates the publishable package (package.json, README, LICENSE).
 */
export async function buildPackage(ctx: BuildContext): Promise<void> {
  console.log('  Generating package...');

  const workspaceRoot = join(ctx.rootDir, '../..');

  const tokensPackageJson = JSON.parse(
    await readFile(join(ctx.rootDir, 'package.json'), 'utf-8'),
  );
  const rootPackageJson = JSON.parse(
    await readFile(join(workspaceRoot, 'package.json'), 'utf-8'),
  );

  const { name, version, type, description, keywords } = tokensPackageJson;
  const { author, license, repository } = rootPackageJson;

  const distPackageJson: Record<string, unknown> = {};
  for (const [k, v] of Object.entries({ name, version, type, description, keywords, author, license, repository })) {
    if (v !== undefined) distPackageJson[k] = v;
  }

  const webDir = join(ctx.distDir, 'web');
  await writeFileSafe(
    join(webDir, 'package.json'),
    JSON.stringify(distPackageJson, null, 2) + '\n',
  );

  try {
    await copyFile(join(ctx.rootDir, 'README.md'), join(webDir, 'README.md'));
  } catch { /* README may not exist */ }
  try {
    await copyFile(join(workspaceRoot, 'LICENSE'), join(webDir, 'LICENSE'));
  } catch { /* LICENSE may not exist */ }
}
