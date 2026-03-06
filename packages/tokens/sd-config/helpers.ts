/**
 * Converts a token name segment to a CSS variable segment.
 * Replicates the exact logic of designTokenNameSegmentToCssVariableSegment.
 */
export function segmentToCssSegment(segment: string): string {
  return (
    segment
      // replace white-spaces with single dash
      .replace(/\s+/g, '-')
      // convert camelCase/PascalCase to dash-case
      .replace(
        /[A-Z]/g,
        (letter: string, offset: number): string =>
          `${offset > 0 ? '-' : ''}${letter.toLowerCase()}`,
      )
      // remove starting and ending dashes
      .replace(/^-+|-+$/g, '')
      // remove consecutive dashes
      .replace(/--+/g, '-')
      // remove all non-alphanumeric or dash characters
      .replace(/[^a-z0-9-]/g, '')
  );
}

/**
 * Generates a CSS variable name from path segments.
 * DEFAULT mode: filters out empty and dash-only segments.
 */
export function generateCssVariableName(
  segments: string[],
  prefix: string = '',
  removeEmptyAndDash: boolean = true,
): string {
  let converted = segments.map(segmentToCssSegment);
  if (removeEmptyAndDash) {
    converted = converted.filter((s) => s !== '' && s !== '-');
  }
  const prefixStr = prefix ? `${prefix}-` : '';
  return `--${prefixStr}${converted.join('-')}`;
}

/**
 * CSS file header matching the existing output exactly.
 */
export const CSS_HEADER = `/*\n    Do not edit directly, this file was auto-generated.\n*/\n\n`;

/**
 * Auto-generated file header text.
 */
export const AUTO_GENERATED_FILE_HEADER = 'Do not edit directly, this file was auto-generated.';

/**
 * T1 directory name constant.
 */
export const T1_DIRECTORY_NAME = 't1-primitive';
export const T2_DIRECTORY_NAME = 't2-semantic';
export const T3_DIRECTORY_NAME = 't3-component';

export const DESIGN_TOKEN_TIERS = [T1_DIRECTORY_NAME, T2_DIRECTORY_NAME, T3_DIRECTORY_NAME];

/**
 * CSS variable prefix for the design system.
 */
export const CSS_VARIABLE_PREFIX = 'esds';
