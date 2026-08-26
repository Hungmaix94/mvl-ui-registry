import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, X } from 'lucide-react';
import { cn } from '../lib/utils';

export interface SelectOption {
  label: string;
  value: string;
  subtitle?: string;
  disabled?: boolean;
}

export interface CustomSelectProps {
  label?: string;
  options: SelectOption[];
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
    <div className={cn('w-full space-y-1.5 font-sans relative', className)} ref={containerRef}>
      {label && (
        <label className="block text-xs font-semibold text-slate-700">
          {label} {required && <span className="text-[#B32B2F] font-bold">*</span>}
        </label>
      )}

      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={cn(
          'w-full min-h-[38px] px-3 py-2 flex items-center justify-between text-xs bg-white border rounded-xl cursor-pointer select-none transition-all duration-150',
          error
            ? 'border-rose-400 bg-rose-50/20'
            : isOpen
            ? 'border-[#B32B2F] ring-2 ring-[#B32B2F]/20'
            : 'border-slate-200 hover:border-slate-300',
          disabled && 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed'
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
            className={cn('text-slate-400 transition-transform duration-200', isOpen && 'rotate-180 text-[#B32B2F]')}
          />
        </div>
      </div>

      {isOpen && !disabled && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1 max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl animate-in fade-in zoom-in-95">
          {options.length === 0 ? (
            <div className="px-3 py-2 text-xs text-slate-400 text-center">Không có lựa chọn nào</div>
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
                    'flex items-center justify-between px-3 py-2 rounded-lg text-xs cursor-pointer transition-colors',
                    isSelected
                      ? 'bg-rose-50 text-[#B32B2F] font-bold'
                      : opt.disabled
                      ? 'text-slate-300 cursor-not-allowed'
                      : 'text-slate-700 hover:bg-slate-50'
                  )}
                >
                  <div>
                    <div className="truncate">{opt.label}</div>
                    {opt.subtitle && <div className="text-[10px] text-slate-400 font-normal">{opt.subtitle}</div>}
                  </div>
                  {isSelected && <Check size={14} className="text-[#B32B2F] shrink-0" />}
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
