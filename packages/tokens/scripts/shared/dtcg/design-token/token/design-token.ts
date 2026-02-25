import type { ExplicitAny } from '../../../../../../../scripts/helpers/types/explicit-any.ts';
import type { ValueOrDesignTokenReference } from '../reference/value-or/value-or-design-token-reference.ts';

/**
 * @inheritDoc https://www.designtokens.org/tr/2025.10/format/#design-token
 * @inheritDoc https://www.designtokens.org/tr/2025.10/format/#design-token-0
 *
 * > An object with a $value property is a token
import type { ValueOrDesignTokenReference } from '../reference/value-or/value-or-design-token-reference.ts';

/**
@@ -14,5 +15,5 @@ export interface DesignToken<GType extends string, GValue> {
readonly $type?: GType;
readonly $deprecated?: boolean | string;
readonly $description?: string;
readonly $extensions?: Record<string, unknown>;
}
