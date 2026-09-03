import type { Meta, StoryObj } from '@storybook/react';
import { PageTitle } from './page-title';

const meta = {
  title: 'web-app/ui/PageTitle',
  component: PageTitle as any,
  tags: ['autodocs'],
  argTypes: {},
} satisfies Meta<typeof PageTitle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};
