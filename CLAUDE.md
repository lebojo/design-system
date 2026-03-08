# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Infomaniak Design System — design tokens (DTCG standard) with multi-platform output and Storybook documentation. Monorepo with Yarn 4.12.0 workspaces.

## Commands

| Task | Command |
|------|---------|
| Install deps | `yarn install` |
| Build all | `yarn build` |
| Build tokens only | `yarn build:tokens` |
| Build Storybook | `yarn build:docs` |
| Storybook dev server | `cd apps/docs && yarn dev` |
| Demo dev server | `cd packages/tokens/demo && yarn dev` |
| Run tests | `yarn test` |
| Tests with coverage | `yarn test:coverage` |
| Format code | `yarn format` |
| Lint code | `yarn lint` |
| Type-check + format + lint | `yarn check` |
| Validate tokens | `cd packages/tokens && yarn validate:tokens` |

## Architecture

### Token Tiers (DTCG format)

Tokens live in `packages/tokens/tokens/` with a 3-tier hierarchy:

- **t1-primitive/** — Base values (colors, dimensions, spacing). Direct values only.
- **t2-semantic/** — Contextual meanings (e.g., `color.background.elevation.surface.default`). Always reference t1 tokens.
- **t3-component/** — Component-specific tokens. Reference t1 or t2.
- **modifiers/** — Theme overrides (`light.tokens.json`, `dark.tokens.json`) and product overrides (`mail`, `kdrive`, `calendar`, etc.).

### Style Dictionary v5 Build (`packages/tokens/sd-config/`)

`build.ts` orchestrates parallel builds using Style Dictionary v5:

- **Custom parser** (`preprocessors.ts`): Fixes `$type` inheritance across merged JSON files, normalizes color objects (`{hex, colorSpace, components}` → `#rrggbb`) and dimension objects (`{value, unit}` → `"16px"`).
- **Custom transforms** (`transforms.ts`): `esds/name` converts paths to CSS variable names; `esds/typography-shorthand` creates CSS font shorthand.
- **Build outputs** (`build/*.ts`): CSS (`:root` and `[data-esds-tokens]` variants), Tailwind `@theme inline`, Figma JSON, Kotlin Compose, Swift + XCAssets, Markdown preview tables.
- **CSS variable prefix**: `--esds-`

Output lands in `packages/tokens/dist-sd/` with subdirs: `web/`, `android/`, `ios/`, `markdown/`, `figma.tokens.json`.

### Workspaces

1. `packages/tokens` — Token definitions, Style Dictionary build, output generation
2. `apps/docs` — Storybook documentation (CSF Next format, React 19)
3. `packages/tokens/demo` — Vite + Tailwind demo app

## Code Style

- **Formatter**: Prettier — single quotes, 100 char width, single attribute per line
- **Imports**: Auto-organized via `prettier-plugin-organize-imports`
- **Naming**: functions `camelCase`, types `PascalCase`, files `kebab-case.ts`, tests `*.test.ts`, tokens `*.tokens.json`
- **TypeScript**: Strict mode, `NodeNext` module resolution, import with `.ts` extensions
- **Testing**: Vitest with **100% coverage threshold** enforced
- **Node**: v24 (use `nvm use`)

## Git & PR Conventions

- **Commits & PR titles**: Conventional Commits (`feat:`, `fix:`, `docs:`, etc.)
- **Branch naming**: `feat/xxx`, `fix/xxx`, `docs/xxx`
- **Do not squash** commits on merge (preserve history)
- **Run `yarn check`** before requesting review
- **Publishing**: `develop` branch → `rc` npm tag (`x.y.z-rc.n`), `main` → `latest` (`x.y.z`)

## Storybook Conventions

Use CSF Next (Component Story Format Next) — single story per file with `render` in default export:

```typescript
import type { Meta } from '@storybook/react';

export default {
  title: 'Path/To/Story',
  render: () => { /* story */ },
} satisfies Meta;
```
