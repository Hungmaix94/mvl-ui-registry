import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Modal } from './modal';
import { Button } from './button';

const meta: Meta<typeof Modal> = {
  title: 'Web App/Modal/Modal',
  component: Modal,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof Modal>;

const ModalWithTrigger = (args: any) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div>
      <Button onClick={() => setIsOpen(true)}>Mở Modal</Button>
      <Modal {...args} isOpen={isOpen} onClose={() => setIsOpen(false)}>
        <p className="text-sm text-slate-600">Đây là nội dung của Modal. Bạn có thể thêm bất kỳ component nào vào đây.</p>
      </Modal>
    </div>
  );
};

export const Default: Story = {
  render: (args) => <ModalWithTrigger {...args} />,
  args: {
    title: 'Tiêu đề Modal',
    description: 'Mô tả ngắn gọn về chức năng của Modal này.',
    maxWidth: 'md',
  },
};
