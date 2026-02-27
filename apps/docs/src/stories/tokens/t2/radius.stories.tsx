import type { Meta } from '@storybook/react';
import Markdown from 'markdown-to-jsx';
import T2RadiusMarkdown from '../../assets/t2-radius.md?raw';

export default {
  title: 'Design Tokens/T2/Radius',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        story: 'T2 Radius tokens provide semantic border radius definitions.',
      },
    },
  },
} satisfies Meta;

export const RadiusTokens = {
  render: () => (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <Markdown>{T2RadiusMarkdown}</Markdown>
    </div>
  ),
};
