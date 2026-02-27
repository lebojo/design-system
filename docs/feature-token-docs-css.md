# Feature Status: CSS-Based Token Documentation

## Summary

Implementation of CSS-based token resolution for Storybook documentation, enabling dynamic product/theme switching via CSS cascade without JavaScript computation.

---

## What Was Accomplished

### 1. Markdown Generation Updates

**11 markdown token generators updated** to use CSS variables in preview HTML:
- `color-design-tokens-collection-token-to-markdown.ts`
- `dimension-design-tokens-collection-token-to-markdown.ts`
- `radius-design-tokens-collection-token-to-markdown.ts`
- `shadow-design-tokens-collection-token-to-markdown.ts`
- `font-weight-design-tokens-collection-token-to-markdown.ts`
- `font-family-design-tokens-collection-token-to-markdown.ts`
- `opacity-design-tokens-collection-token-to-markdown.ts`
- `breakpoint-design-tokens-collection-token-to-markdown.ts`
- `border-width-design-tokens-collection-token-to-markdown.ts`
- `number-design-tokens-collection-token-to-markdown.ts`
- `generic-design-tokens-collection-token-to-markdown.ts`

**4-column table format** implemented:
| Preview | Token Name | CSS Variable | Description |
|---------|-----------|--------------|-------------|

**Token resolution logic**:
- **T1 tokens**: Show resolved values (hex colors, px values, etc.) in display text
- **T2/T3 tokens**: Show referenced token name (e.g., `font.weight.400`) for universal readability
- **CSS variables** used directly in preview HTML: `background: var(--esds-color-red-50)`

### 2. Storybook Configuration

**preview.ts updates**:
- Imports all CSS modifiers (10 products, 2 themes) from `@infomaniak-design-system/tokens`
- Global toolbar selectors for Product and Theme with URL persistence
- Attempted decorator implementation to apply data attributes

**CSS modifiers imported**:
- Products: infomaniak, mail, kdrive, kchat, calendar, contacts, knote, security, euria, swisstransfer
- Themes: light, dark

---

## Key Issues Encountered

### Issue 1: Decorators Don't Apply to MDX Docs

**Problem**: Storybook decorators in `preview.ts` only work for CSF stories (`.stories.tsx`), NOT for MDX documentation pages.

**Evidence**:
- MDX docs render in iframe without decorator pipeline
- `document.body.setAttribute()` in decorator never executes for MDX pages
- 22 MDX files in `/apps/docs/src/stories/` not covered by decorators

**Reference**: Storybook GitHub Discussion #32362

### Issue 2: MDX Import Resolution

**Problem**: Custom React components cannot be imported into MDX files with Vite/Storybook configuration.

**Failed Attempts**:
- Wrapper component `TokenThemeProvider.tsx` - unresolved import errors
- Both `.tsx` and `.jsx` extensions failed
- Path resolution issues with Vite/Storybook builder

### Issue 3: Build Infrastructure

**Problem**: Missing generated files (`t1-overview.md`, `t2-overview.md`, `t3-overview.md`) blocking builds.

**Status**: These files should be auto-generated during token build process, but current build fails without them.

---

## What's Left to Do

### Option A: Fix the Decorator Approach (Community Recommended)

Use Storybook's Channel API to read globals directly in a way that works with MDX:

```javascript
// In preview.ts or manager.ts
import { addons } from '@storybook/preview-api';
import { UPDATE_GLOBALS } from 'storybook/internal/core-events';

const channel = addons.getChannel();
// Apply attributes when globals change
channel.on(UPDATE_GLOBALS, ({ globals }) => {
  document.body.setAttribute('data-esds-product', globals.product);
  document.body.setAttribute('data-esds-theme', globals.theme);
});
```

**Pros**:
- No MDX file changes needed
- Works with existing structure
- Community-tested approach

**Cons**:
- May need manager-level addon instead of preview decorator
- Requires understanding Storybook's manager vs preview architecture

### Option B: Manager-Level Addon

Create an addon that listens to toolbar changes at the manager level:

```javascript
// .storybook/manager.ts
addons.register('token-sync', () => {
  const channel = addons.getChannel();
  channel.on(UPDATE_GLOBALS, ({ globals }) => {
    // Communicate to preview iframe
    channel.emit('apply-token-theme', globals);
  });
});
```

**Pros**:
- Proper Storybook addon architecture
- Separates concerns

**Cons**:
- More complex setup
- Requires addon registration

### Option C: Pre-generate Static Pages

Instead of dynamic switching, generate separate markdown files for each product/theme:

**Pros**:
- Simple, static, no runtime JS needed
- Works with current architecture

**Cons**:
- More files (10 products × 2 themes = 20 variants per token category)
- Manual switching via navigation
- Larger build output

---

## Technical Context

### File Locations

- **Token generators**: `/packages/tokens/scripts/shared/dtcg/resolver/to/markdown/token/types/`
- **CSS modifiers**: `/packages/tokens/dist/web/css/modifiers/`
- **MDX docs**: `/apps/docs/src/stories/tokens/`
- **Storybook config**: `/apps/docs/.storybook/`

### CSS Cascade Strategy

CSS modifiers use attribute selectors:

```css
[data-esds-product="mail"] {
  --esds-color-background-brand-default: var(--esds-color-pink-700);
}
```

For dynamic switching to work, `data-esds-product` must be applied to `<body>` or root element.

### Implementation Pattern

Current markdown preview HTML:
```html
<div style="background: var(--esds-color-red-50);"></div>
<div>font.weight.400</div>
```

Browser resolves `var(--esds-color-red-50)` via CSS cascade, making product-specific colors work automatically once data attributes are applied.

---

## Recommended Next Steps

1. **Investigate Storybook's recommended approach** for global state in MDX docs
2. **Try manager-level addon** approach (Option B)
3. **Test with minimal implementation** first (log to console when toolbar changes)
4. **Verify CSS cascade works** once attributes are applied
5. **Fix missing overview.md files** in token build process

---

## Current State Summary

| Feature | Status |
|---------|---------|
| CSS variables in preview HTML | ✅ Implemented |
| 4-column table format | ✅ Implemented |
| Token name display (T2/T3) | ✅ Implemented |
| CSS modifier imports | ✅ Implemented |
| Toolbar selectors | ✅ Implemented |
| Dynamic product switching | ❌ Not working |
| Data attributes on body | ❌ Not applied |
| Build (missing overview files) | ❌ Failing |

---

## Questions for Implementation

1. Should we prioritize dynamic switching or ship with current functionality?
2. Is a manager-level addon acceptable architecture?
3. Should we generate static product-specific pages as fallback?
4. What's the timeline for fixing the overview.md generation?

---

*Last updated: February 27, 2025*
