import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from './popover';
import { Button } from './button';

const meta: Meta<typeof Popover> = {
  title: 'Web App/Popover',
  component: Popover,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;

export const Default: StoryObj<typeof Popover> = {
  render: () => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">Open Popover</Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="grid gap-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none">Dimensions</h4>
            <p className="text-sm text-slate-500">
              Set the dimensions for the layer.
            </p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  ),
};
