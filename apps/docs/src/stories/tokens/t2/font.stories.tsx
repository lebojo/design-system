import type { Meta } from '@storybook/react';
import Markdown from 'markdown-to-jsx';
import T2FontMarkdown from '../../assets/t2-font.md?raw';

export default {
  title: 'Design Tokens/T2/Font',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        story: 'T2 Font tokens provide semantic typography definitions.',
      },
    },
  },
} satisfies Meta;

export const FontTokens = {
  render: () => (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <Markdown>{T2FontMarkdown}</Markdown>
    </div>
  ),
};
