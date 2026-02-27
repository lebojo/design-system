import type { Meta } from '@storybook/react';
import Markdown from 'markdown-to-jsx';
import T2BorderMarkdown from '../../assets/t2-border.md?raw';

export default {
  title: 'Design Tokens/T2/Border',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        story: 'T2 Border tokens provide semantic border style definitions.',
      },
    },
  },
} satisfies Meta;

export const BorderTokens = {
  render: () => (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <Markdown>{T2BorderMarkdown}</Markdown>
    </div>
  ),
};
