import type { Meta, StoryObj } from '@storybook/react';
import { FileUpload } from './file-upload';

const meta = {
  title: 'web-app/ui/FileUpload',
  component: FileUpload as any,
  tags: ['autodocs'],
  argTypes: {},
} satisfies Meta<typeof FileUpload>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};
