import type { Meta } from '@storybook/react';
import Markdown from 'markdown-to-jsx';
import T2SpacingMarkdown from '../../assets/t2-spacing.md?raw';

export default {
  title: 'Design Tokens/T2/Spacing',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        story: 'T2 Spacing tokens provide semantic spacing definitions.',
      },
    },
  },
} satisfies Meta;

export const SpacingTokens = {
  render: () => (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <Markdown>{T2SpacingMarkdown}</Markdown>
    </div>
  ),
};
