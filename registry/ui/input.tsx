import React from 'react';
import { cn } from '../lib/utils';

export interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
}

export const TextInput = React.forwardRef<HTMLInputElement, TextInputProps>(
  ({ className, label, error, hint, required, id, ...props }, ref) => {
    const generatedId = id || (label ? `input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

    return (
      <div className="w-full space-y-1.5 font-sans">
        {label && (
          <label htmlFor={generatedId} className="block text-xs font-semibold text-slate-700">
            {label} {required && <span className="text-[#B32B2F] font-bold">*</span>}
          </label>
        )}
        <input
          id={generatedId}
          ref={ref}
          className={cn(
            'w-full px-3.5 py-2 text-xs text-slate-900 bg-white border rounded-xl placeholder:text-slate-400 focus:outline-none transition-all duration-150',
            error
              ? 'border-rose-400 bg-rose-50/20 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
              : 'border-slate-200 focus:border-[#B32B2F] focus:ring-2 focus:ring-[#B32B2F]/20',
            props.disabled && 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed',
            className
          )}
          {...props}
        />
        {error ? (
          <p className="text-[11px] font-medium text-rose-600 animate-in fade-in">{error}</p>
        ) : hint ? (
          <p className="text-[11px] text-slate-400">{hint}</p>
        ) : null}
      </div>
    );
  }
);

TextInput.displayName = 'TextInput';
