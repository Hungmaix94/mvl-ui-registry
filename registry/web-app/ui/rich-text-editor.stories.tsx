import type { Meta, StoryObj } from '@storybook/react';
import { RichTextEditor } from './rich-text-editor';

const meta: Meta<typeof RichTextEditor> = {
  title: 'Web App/RichTextEditor/RichTextEditor',
  component: RichTextEditor,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof RichTextEditor>;

export const Default: Story = {
  args: {
    // Add default args here
  },
};
