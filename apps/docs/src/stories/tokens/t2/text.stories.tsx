import type { Meta } from '@storybook/react';
import Markdown from 'markdown-to-jsx';
import T2TextMarkdown from '../../assets/t2-text.md?raw';

export default {
  title: 'Design Tokens/T2/Text',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        story: 'T2 Text tokens provide text styling definitions.',
      },
    },
  },
} satisfies Meta;

export const TextTokens = {
  render: () => (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <Markdown>{T2TextMarkdown}</Markdown>
    </div>
  ),
};
