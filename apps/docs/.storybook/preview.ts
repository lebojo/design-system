import type { Preview } from '@storybook/react-vite';
import Table from '../src/components/Table.tsx';

// Import base CSS tokens
import '@infomaniak-design-system/tokens/dist/web/css/tokens.root.css';

// Import all product modifiers (for dynamic switching via data-esds-product attribute)
import '@infomaniak-design-system/tokens/dist/web/css/modifiers/product/calendar.attr.css';
import '@infomaniak-design-system/tokens/dist/web/css/modifiers/product/contacts.attr.css';
import '@infomaniak-design-system/tokens/dist/web/css/modifiers/product/euria.attr.css';
import '@infomaniak-design-system/tokens/dist/web/css/modifiers/product/infomaniak.attr.css';
import '@infomaniak-design-system/tokens/dist/web/css/modifiers/product/kchat.attr.css';
import '@infomaniak-design-system/tokens/dist/web/css/modifiers/product/kdrive.attr.css';
import '@infomaniak-design-system/tokens/dist/web/css/modifiers/product/knote.attr.css';
import '@infomaniak-design-system/tokens/dist/web/css/modifiers/product/mail.attr.css';
import '@infomaniak-design-system/tokens/dist/web/css/modifiers/product/security.attr.css';
import '@infomaniak-design-system/tokens/dist/web/css/modifiers/product/swisstransfer.attr.css';

// Import all theme modifiers (for dynamic switching via data-esds-theme attribute)
import '@infomaniak-design-system/tokens/dist/web/css/modifiers/theme/dark.attr.css';
import '@infomaniak-design-system/tokens/dist/web/css/modifiers/theme/light.attr.css';

const preview: Preview = {
  parameters: {
    controls: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: 'todo',
    },
    docs: {
      components: {
        Table,
      },
    },
    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: 'todo',
    },
  },
  decorators: [
    // Apply data attributes to body based on global toolbar selections
    (StoryFn, context) => {
      const product = context.globals.product || 'infomaniak';
      const theme = context.globals.theme || 'light';

      // Apply data attributes to document.body so CSS selectors work
      if (typeof document !== 'undefined') {
        document.body.setAttribute('data-esds-product', product);
        document.body.setAttribute('data-esds-theme', theme);
      }

      return StoryFn();
    },
  ],
};

export default preview;

/**
 * Global types for toolbar selectors with URL persistence.
 * Storybook automatically persists these in the URL (e.g., ?globals=product:mail;theme:dark)
 */
export const globalTypes = {
  product: {
    name: 'Product',
    description: 'Product selector',
    defaultValue: 'infomaniak',
    toolbar: {
      icon: 'box',
      items: [
        { value: 'infomaniak', title: 'Infomaniak' },
        { value: 'mail', title: 'Mail' },
        { value: 'kdrive', title: 'kDrive' },
        { value: 'kchat', title: 'kChat' },
        { value: 'calendar', title: 'Calendar' },
        { value: 'contacts', title: 'Contacts' },
        { value: 'knote', title: 'kNote' },
        { value: 'security', title: 'Security' },
        { value: 'euria', title: 'Euria' },
        { value: 'swisstransfer', title: 'SwissTransfer' },
      ],
      showName: true,
      dynamicTitle: true,
    },
  },
  theme: {
    name: 'Theme',
    description: 'Theme selector',
    defaultValue: 'light',
    toolbar: {
      icon: 'eye',
      items: [
        { value: 'light', title: 'Light' },
        { value: 'dark', title: 'Dark' },
      ],
      showName: true,
      dynamicTitle: true,
    },
  },
};
