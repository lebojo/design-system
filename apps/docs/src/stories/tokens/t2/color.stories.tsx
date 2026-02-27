import type { Meta } from '@storybook/react';
import Markdown from 'markdown-to-jsx';
import T2ColorMarkdown from '../../assets/t2-color.md?raw';

export default {
  title: 'Design Tokens/T2/Color',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        story:
          'T2 Color tokens provide semantic color definitions for backgrounds, text, borders, and interactive states. Use the toolbar selectors above to switch between products and themes.',
      },
    },
  },
} satisfies Meta;

export const ColorTokens = {
  render: () => (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <Markdown>{T2ColorMarkdown}</Markdown>
    </div>
  ),
};
