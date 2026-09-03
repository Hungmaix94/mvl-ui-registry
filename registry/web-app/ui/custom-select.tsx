import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, X } from 'lucide-react';
import { cn } from '../lib/utils';

export interface CustomSelectOption {
  label: string;
  value: string;
  subtitle?: string;
  disabled?: boolean;
}

export interface CustomSelectProps {
  label?: string;
  options: CustomSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  clearable?: boolean;
  disabled?: boolean;
  className?: string;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  label,
  options = [],
  value,
  onChange,
  placeholder = 'Chọn một mục...',
  error,
  hint,
  required,
  clearable = false,
  disabled = false,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  return (
    <div className={cn('w-full space-y-1.5 font-inter relative', className)} ref={containerRef}>
      {label && (
        <label className="block text-sm font-semibold text-content-dark-1 mb-1.5">
          {label} {required && <span className="text-action-primary-red-default font-bold">*</span>}
        </label>
      )}

      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={cn(
          'w-full min-h-[38px] px-3 py-2 flex items-center justify-between text-sm bg-white border rounded cursor-pointer select-none transition-all duration-150',
          error
            ? 'border-data-red-default bg-data-red-default/5'
            : isOpen
            ? 'border-action-primary-red-default outline-none'
            : 'border-slate-200 hover:border-slate-300',
          disabled && 'bg-data-light-grey-disabled text-content-dark-4 border-slate-200 cursor-not-allowed'
        )}
      >
        <span className={selectedOption ? 'text-slate-900 font-medium truncate' : 'text-slate-400 truncate'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>

        <div className="flex items-center gap-1 shrink-0 ml-2">
          {clearable && selectedOption && !disabled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
              className="text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
            >
              <X size={13} />
            </button>
          )}
          <ChevronDown
            size={14}
            className={cn('text-slate-400 transition-transform duration-200', isOpen && 'rotate-180 text-action-primary-red-default')}
          />
        </div>
      </div>

      {isOpen && !disabled && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1 max-h-60 overflow-y-auto rounded border border-slate-200 bg-white p-1 shadow-md animate-in fade-in zoom-in-95">
          {options.length === 0 ? (
            <div className="px-3 py-3 text-sm text-content-dark-3 text-center">Không có lựa chọn nào</div>
          ) : (
            options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <div
                  key={opt.value}
                  onClick={() => {
                    if (!opt.disabled) {
                      onChange(opt.value);
                      setIsOpen(false);
                    }
                  }}
                  className={cn(
                    'flex items-center justify-between px-3 py-2 rounded text-sm cursor-pointer transition-colors',
                    isSelected
                      ? 'bg-action-primary-red-default/10 text-action-primary-red-default font-medium'
                      : opt.disabled
                      ? 'text-content-dark-4 cursor-not-allowed bg-transparent'
                      : 'text-content-dark-1 hover:bg-slate-50'
                  )}
                >
                  <div>
                    <div className="truncate">{opt.label}</div>
                    {opt.subtitle && <div className="text-[11px] text-content-dark-3 font-normal mt-0.5">{opt.subtitle}</div>}
                  </div>
                  {isSelected && <Check size={16} className="text-action-primary-red-default shrink-0" />}
                </div>
              );
            })
          )}
        </div>
      )}

      {error ? (
        <p className="text-[11px] font-medium text-rose-600 animate-in fade-in">{error}</p>
      ) : hint ? (
        <p className="text-[11px] text-slate-400">{hint}</p>
      ) : null}
    </div>
  );
};
