import type { ExplicitAny } from '../../types/explicit-any.ts';

export type EqualFunction<GValue = ExplicitAny> = (a: GValue, b: GValue) => boolean;
