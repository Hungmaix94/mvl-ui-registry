import type { Meta, StoryObj } from '@storybook/react';
import { FileUpload } from './FileUpload';

const meta: Meta<typeof FileUpload> = {
  title: 'Web App/file-upload/FileUpload',
  component: FileUpload,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof FileUpload>;

export const Default: Story = {
  args: {
    // Add default args here
  },
};
