import type { Meta, StoryObj } from '@storybook/react';
import { AttachmentSection } from './attachment-section';

const meta = {
  title: 'web-app/ui/AttachmentSection',
  component: AttachmentSection as any,
  tags: ['autodocs'],
  argTypes: {},
} satisfies Meta<typeof AttachmentSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};
