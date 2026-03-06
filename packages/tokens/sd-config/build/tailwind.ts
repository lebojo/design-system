import { join } from 'node:path';
import {
  type BuildContext,
  CSS_VARIABLE_PREFIX,
  CSS_HEADER,
  T1_DIRECTORY_NAME,
  segmentToCssSegment,
  writeFileSafe,
} from './context.ts';

/**
 * Builds the Tailwind CSS file (@theme inline).
 */
export async function buildTailwind(ctx: BuildContext): Promise<void> {
  console.log('  Writing Tailwind CSS...');

  const declarations: string[] = [];
  declarations.push('--*: initial;');

  const defaultName = (segs: string[]): string =>
    `--${segs.map(segmentToCssSegment).filter((s) => s !== '' && s !== '-').join('-')}`;
  const rawName = (segs: string[]): string =>
    `--${segs.map(segmentToCssSegment).join('-')}`;

  for (const token of ctx.baseTokens) {
    const tokenName = token.path.join('.');
    if ((token.filePath ?? '').includes(T1_DIRECTORY_NAME)) continue;

    const esdsVarRef = `var(--${CSS_VARIABLE_PREFIX}-${token.name})`;

    if (tokenName.startsWith('color')) {
      declarations.push(`${defaultName(['color', ...token.path.slice(1)])}: ${esdsVarRef};`);
    } else if (tokenName.startsWith('font.family')) {
      declarations.push(`${defaultName(['font', ...token.path.slice(2)])}: ${esdsVarRef};`);
    } else if (tokenName.startsWith('text')) {
      if (tokenName.endsWith('size')) {
        declarations.push(`${rawName(['text', ...token.path.slice(1, -1)])}: ${esdsVarRef};`);
      } else if (tokenName.endsWith('line-height')) {
        declarations.push(`${rawName(['text', ...token.path.slice(1, -1), '', 'line-height'])}: ${esdsVarRef};`);
      }
    } else if (tokenName.startsWith('font.weight')) {
      declarations.push(`${defaultName(['font', 'weight', ...token.path.slice(2)])}: ${esdsVarRef};`);
    } else if (tokenName.startsWith('radius')) {
      declarations.push(`${rawName(['radius', ...token.path.slice(1)])}: ${esdsVarRef};`);
    }
  }

  declarations.push('--spacing: 1px;');

  const vars = declarations.map((d) => `  ${d}`).join('\n');
  await writeFileSafe(
    join(ctx.distDir, 'web/tailwind.css'),
    `${CSS_HEADER}@theme inline {\n${vars}\n}\n`,
  );
}
