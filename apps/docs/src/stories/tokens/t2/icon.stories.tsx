import type { Meta } from '@storybook/react';
import Markdown from 'markdown-to-jsx';
import T2IconMarkdown from '../../assets/t2-icon.md?raw';

export default {
  title: 'Design Tokens/T2/Icon',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        story: 'T2 Icon tokens provide icon-related definitions.',
      },
    },
  },
} satisfies Meta;

export const IconTokens = {
  render: () => (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <Markdown>{T2IconMarkdown}</Markdown>
    </div>
  ),
};
