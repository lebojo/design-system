import { join } from 'node:path';
import type { TransformedToken } from 'style-dictionary/types';
import {
  type BuildContext,
  filterT1ColorTokens,
  normalizeHex,
  writeFileSafe,
} from './context.ts';

/**
 * Builds the Kotlin Compose color tokens file.
 */
export async function buildKotlin(ctx: BuildContext): Promise<void> {
  console.log('  Building Kotlin tokens...');

  const colorTokens = filterT1ColorTokens(ctx.baseTokens);

  const properties = colorTokens
    .map((token: TransformedToken) => {
      const name = token.path.filter((part: string) => part !== 'color').join('');
      const hex = normalizeHex(
        String(token.$value ?? token.value).replace(/^#/, '').toUpperCase(),
      );
      const alpha = hex.length === 8 ? hex.slice(6, 8) : 'FF';
      const rgb = hex.slice(0, 6);
      return { name, hexValue: `0x${alpha}${rgb}` };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const content = [
    '//',
    '// Do not edit directly, this file was auto-generated.',
    '//',
    '',
    'package com.infomaniak.designsystem.compose',
    '',
    'import androidx.compose.ui.graphics.Color',
    '',
    'object EsdsColorRawTokens {',
    ...properties.map((p) => `    val ${p.name} = Color(${p.hexValue})`),
    '}',
    '',
  ].join('\n');

  await writeFileSafe(join(ctx.distDir, 'android/compose/EsdsColorRawTokens.kt'), content);
}
