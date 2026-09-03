import React from 'react';
import { Modal } from './modal';
import { Button } from './button';

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  loading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Xoá',
  cancelText = 'Huỷ',
  variant = 'danger',
  loading = false,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="md">
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="px-6 pt-12 pb-6 text-center space-y-3">
          <h2 className="text-xl font-semibold text-content-dark-1 leading-tight">
            {title}
          </h2>
          <div className="text-base text-content-dark-2 leading-relaxed">
            {description}
          </div>
        </div>

        <div className="px-6 pb-12 mt-4 flex items-center justify-center gap-4">
          <Button 
            variant="secondary" 
            onClick={onClose} 
            disabled={loading}
            className="min-w-[150px] whitespace-nowrap h-11"
          >
            {cancelText}
          </Button>
          <Button
            variant={variant === 'danger' ? 'danger' : 'primary'}
            onClick={onConfirm}
            loading={loading}
            className="min-w-[150px] whitespace-nowrap h-11"
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
