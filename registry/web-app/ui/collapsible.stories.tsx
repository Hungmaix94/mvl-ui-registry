import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from './collapsible';
import { Button } from './button';
import { ChevronDown, ChevronUp } from 'lucide-react';

const meta: Meta<typeof Collapsible> = {
  title: 'Web App/Collapsible',
  component: Collapsible,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;

export const Default: StoryObj<typeof Collapsible> = {
  render: () => {
    const [isOpen, setIsOpen] = React.useState(false);

    return (
      <Collapsible
        open={isOpen}
        onOpenChange={setIsOpen}
        className="w-[400px] border border-slate-200 rounded bg-white overflow-hidden"
      >
        <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-100">
          <h4 className="text-sm font-semibold text-content-dark-1">
            Thông tin dự án
          </h4>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-content-light-10 hover:text-slate-800">
              <span className="sr-only">Toggle</span>
              {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </Button>
          </CollapsibleTrigger>
        </div>
        
        <CollapsibleContent className="transition-all data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=open]:animate-in data-[state=open]:fade-in">
          <div className="p-4 space-y-3 bg-white">
            <div className="flex justify-between text-sm">
              <span className="text-content-light-10">Mã dự án:</span>
              <span className="font-medium text-content-dark-1">PRJ-2026-001</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-content-light-10">Trạng thái:</span>
              <span className="font-medium text-emerald-600">Đang triển khai</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-content-light-10">Người phụ trách:</span>
              <span className="font-medium text-content-dark-1">Nguyễn Văn A</span>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  },
};
