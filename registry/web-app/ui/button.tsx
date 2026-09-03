import React from 'react';
import { cn } from '../lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, children, ...props }, ref) => {
    // base styles matching erp-repo: font-inter, 4px border radius (rounded), inline-flex, items-center, justify-center
    const baseStyles = 'font-inter inline-flex items-center justify-center relative rounded transition-all duration-200 focus:outline-none focus:ring-0 focus:ring-offset-0 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer select-none';

    // variant styles matching erp-repo design system
    const variantStyles = {
      primary: 'bg-action-primary-red-default hover:bg-action-primary-red-hover text-content-light-1 border-0 shadow-none',
      secondary: 'bg-action-secondary-grey-default hover:bg-action-secondary-grey-hover text-content-dark-1 border-0',
      danger: 'bg-rose-600 hover:bg-rose-700 text-white border-0', // fallback for danger
      ghost: 'bg-transparent hover:bg-action-secondary-grey-disabled text-content-dark-1 border-0',
      outline: 'bg-data-light-grey-default hover:bg-data-light-grey-hover text-content-dark-2 border-[1.5px] border-solid border-content-dark-2',
    };

    // size styles matching erp-repo
    const sizeStyles = {
      sm: 'text-xs font-medium leading-4 px-3 py-2 gap-1 h-8',
      md: 'text-sm font-medium leading-5 px-3 py-2 gap-2 h-9',
      lg: 'text-base font-medium leading-6 px-4.5 py-2 gap-2 h-10',
      icon: 'p-2.5 w-9 h-9 flex items-center justify-center',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        {...props}
      >
        {loading ? (
          <span className="inline-flex h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : null}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
