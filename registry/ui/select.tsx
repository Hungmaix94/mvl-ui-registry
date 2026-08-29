import React, { useState, useRef, useId, useEffect } from 'react';
import { Check, ChevronDown, X, Search } from 'lucide-react';
import { useClickOutside } from '../hooks/use-click-outside';

export interface SelectOption {
  value: string | number;
  label: string | number;
  subtitle?: string;
  disabled?: boolean;
}

export interface SelectProps {
  id?: string;
  name?: string;
  label?: string;
  value?: string | number;
  defaultValue?: string | number;
  onChange?: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  disabled?: boolean;
  searchable?: boolean;
  clearable?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  triggerClassName?: string;
  dropdownClassName?: string;
  iconSize?: number;
  title?: string;
}

/**
 * MaiVietLand Design System - Standard Select / Dropdown Component
 * Features custom trigger, rotating ChevronDown arrow, and Check icon on active selected item.
 */
export function Select({
  id: customId,
  label,
  value: controlledValue,
  defaultValue,
  onChange,
  options = [],
  placeholder = 'Chọn...',
  error,
  hint,
  required = false,
  disabled = false,
  searchable = false,
  clearable = false,
  size = 'md',
  className = '',
  triggerClassName = '',
  dropdownClassName = '',
  iconSize = 14,
  title,
}: SelectProps) {
  const autoId = useId();
  const id = customId || autoId;

  const [internalValue, setInternalValue] = useState<string | number>(
    controlledValue !== undefined ? controlledValue : (defaultValue ?? ''),
  );
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (controlledValue !== undefined) {
      setInternalValue(controlledValue);
    }
  }, [controlledValue]);

  useClickOutside(containerRef, () => setIsOpen(false), isOpen);

  const selectedValue = controlledValue !== undefined ? controlledValue : internalValue;
  const selectedOption = options.find(
    (opt) => String(opt.value) === String(selectedValue),
  );

  const filteredOptions = options.filter((opt) => {
    if (!search.trim()) return true;
    const labelStr = String(opt.label).toLowerCase();
    const subtitleStr = (opt.subtitle || '').toLowerCase();
    const query = search.toLowerCase();
    return labelStr.includes(query) || subtitleStr.includes(query);
  });

  const handleSelect = (optValue: string | number) => {
    if (controlledValue === undefined) {
      setInternalValue(optValue);
    }
    onChange?.(String(optValue));
    setIsOpen(false);
    setSearch('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (controlledValue === undefined) {
      setInternalValue('');
    }
    onChange?.('');
    setSearch('');
  };

  const sizeClasses = {
    sm: 'h-8 px-2.5 py-1 text-xs rounded-md',
    md: 'h-9.5 px-3.5 py-2 text-xs rounded-lg',
    lg: 'h-11 px-4 py-2.5 text-sm rounded-xl',
  }[size];

  const trigger = (
    <div ref={containerRef} className={`relative inline-block w-full font-sans ${className}`}>
      <button
        type="button"
        id={id}
        title={title}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className={`flex w-full items-center justify-between border bg-white font-medium transition-all select-none cursor-pointer ${sizeClasses} ${
          error
            ? 'border-[#DE350B] ring-1 ring-[#DE350B]/20 text-slate-900'
            : isOpen
              ? 'border-[#B32B2F] ring-2 ring-[#B32B2F]/20 text-slate-900'
              : 'border-slate-300 hover:border-slate-400 text-slate-900'
        } ${disabled ? 'cursor-not-allowed bg-slate-100 text-slate-400 opacity-70' : ''} ${triggerClassName}`}
      >
        <span className={`truncate text-left ${selectedOption ? 'text-slate-900 font-semibold' : 'text-slate-400'}`}>
          {selectedOption ? String(selectedOption.label) : placeholder}
        </span>

        <div className="flex items-center gap-1.5 shrink-0 pl-1.5">
          {clearable && selectedValue && !disabled && (
            <span
              onClick={handleClear}
              className="rounded-full p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
              title="Xóa lựa chọn"
            >
              <X size={iconSize - 2} />
            </span>
          )}
          <ChevronDown
            size={iconSize}
            className={`text-slate-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-[#B32B2F]' : ''
            }`}
          />
        </div>
      </button>

      {/* Dropdown Menu Popup */}
      {isOpen && (
        <div
          role="listbox"
          className={`absolute left-0 z-50 mt-1 min-w-full max-h-60 overflow-y-auto rounded-lg border border-slate-200 bg-white p-1 shadow-xl animate-in fade-in zoom-in-95 duration-100 ${dropdownClassName}`}
        >
          {(searchable || options.length > 8) && (
            <div className="relative mb-1 p-1">
              <Search size={12} className="absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                autoFocus
                placeholder="Tìm..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded border border-slate-200 bg-slate-50 pl-7 pr-2 py-1 text-[11px] text-slate-800 placeholder-slate-400 outline-none focus:border-[#B32B2F] focus:bg-white"
              />
            </div>
          )}

          <div className="space-y-0.5">
            {filteredOptions.length === 0 ? (
              <div className="py-2.5 text-center text-xs text-slate-400">
                Không tìm thấy kết quả
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = String(opt.value) === String(selectedValue);
                return (
                  <button
                    key={String(opt.value)}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    disabled={opt.disabled}
                    onClick={() => handleSelect(opt.value)}
                    className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-xs transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-rose-50 font-bold text-[#B32B2F]'
                        : 'hover:bg-slate-50 text-slate-800'
                    } ${opt.disabled ? 'cursor-not-allowed opacity-40' : ''}`}
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <span className="truncate block">{String(opt.label)}</span>
                      {opt.subtitle && (
                        <span className="text-[10px] text-slate-400 truncate block mt-0.5">
                          {opt.subtitle}
                        </span>
                      )}
                    </div>
                    {isSelected && (
                      <Check
                        size={iconSize}
                        className="text-[#B32B2F] shrink-0 animate-in zoom-in-75 duration-100"
                      />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );

  if (label) {
    return (
      <div className="space-y-1.5">
        <label htmlFor={id} className="block text-xs font-semibold text-slate-700">
          {label}
          {required && <span className="ml-1 text-[#DE350B]">*</span>}
        </label>
        {trigger}
        {hint && !error && <p className="text-[11px] text-slate-500">{hint}</p>}
        {error && <p className="text-[11px] font-medium text-[#DE350B]">{error}</p>}
      </div>
    );
  }

  return trigger;
}

export default Select;
