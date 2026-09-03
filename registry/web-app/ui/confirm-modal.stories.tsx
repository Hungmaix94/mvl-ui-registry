import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ConfirmModal } from './confirm-modal';
import { Button } from './button';

const meta: Meta<typeof ConfirmModal> = {
  title: 'Web App/ConfirmModal/ConfirmModal',
  component: ConfirmModal,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof ConfirmModal>;

const ConfirmModalWithTrigger = (args: any) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div>
      <Button onClick={() => setIsOpen(true)}>Mở Confirm Modal</Button>
      <ConfirmModal 
        {...args} 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)}
        onConfirm={() => {
          console.log('Confirmed!');
          setIsOpen(false);
        }}
      />
    </div>
  );
};

export const Default: Story = {
  render: (args) => <ConfirmModalWithTrigger {...args} />,
  args: {
    title: 'Xóa dữ liệu',
    description: 'Bạn có chắc chắn muốn xóa dữ liệu này không? Hành động này không thể hoàn tác.',
    variant: 'danger',
    confirmText: 'Xóa',
    cancelText: 'Hủy',
  },
};
