import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from './sheet';
import { Button } from './button';

const meta: Meta<typeof Sheet> = {
  title: 'Web App/Sheet',
  component: Sheet,
  tags: ['autodocs'],
};

export default meta;

export const Default: StoryObj<typeof Sheet> = {
  render: () => (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline">Open Sheet</Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Edit profile</SheetTitle>
          <SheetDescription>
            Make changes to your profile here. Click save when you're done.
          </SheetDescription>
        </SheetHeader>
        <div className="py-4">
          <p className="text-sm text-slate-500">Sheet content area.</p>
        </div>
        <SheetFooter>
          <Button variant="primary">Save changes</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  ),
};
