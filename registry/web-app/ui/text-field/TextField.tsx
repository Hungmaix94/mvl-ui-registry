import React, { useMemo } from 'react'
import { IconMagnifyingglass } from '../../icons'
import { IconCommand } from '../../icons'
import { cn } from '@/utils'
import { FormCaption } from '../../ui/form'

export type TextFieldVariant = 'default' | 'search'
export type TextFieldSize = 'default' | 'compact'

export interface TextFieldProps {
  label?: React.ReactNode
  subtitle?: string
  required?: boolean
  labelAction?: React.ReactNode

  placeholder?: string
  value?: string
  defaultValue?: string

  prefix?: React.ReactNode
  suffix?: React.ReactNode

  caption?: string

  variant?: TextFieldVariant
  size?: TextFieldSize

  isValid?: boolean
  error?: string

  // Character counter
  showCharacterCount?: boolean
  maxLength?: number

  // Number specific
  allowNegative?: boolean
  onlyNumber?: boolean

  // HTML attributes
  disabled?: boolean
  readOnly?: boolean
  autoFocus?: boolean
  autoComplete?: string
  /**
   * Tên cho trình đọc màn hình khi `label` không đủ phân biệt.
   *
   * Cần cho các ô "Từ"/"Đến" của bộ lọc khoảng: tiêu đề nhóm nằm ở một `<span>` riêng nên
   * không vào tên khả truy cập, và đơn vị thì nằm trong `suffix` trang trí — không có prop này
   * thì bốn ô trong một nhóm đều xưng là "Từ"/"Đến" y hệt nhau.
   */
  'aria-label'?: string

  // Event handlers
  onChange?: (value: string) => void
  onFocus?: (e?: any) => void
  onBlur?: (e?: any) => void
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void

  // Additional props
  className?: string
  id?: string
  name?: string
  type?: string
  step?: string | number
}

export interface TextFieldRef {
  focus: () => void
}

export const TextField = React.forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  {
    label,
    subtitle,
    required = false,
    labelAction,
    placeholder,
    value,
    defaultValue = '',
    prefix,
    suffix,
    caption,
    variant = 'default',
    size = 'default',
    error,
    isValid,
    showCharacterCount = false,
    maxLength,
    disabled = false,
    readOnly = false,
    autoFocus = false,
    autoComplete,
    onChange,
    onFocus,
    onBlur,
    onKeyDown,
    className = '',
    id,
    name,
    type = 'text',
    allowNegative = true,
    onlyNumber = false,
    step,
    'aria-label': ariaLabel,
  },
  ref
) {
  const _id = useMemo(() => `${id}_${name}_${type}_${Date.now()}`, [id, name, type])

  // Handle internal state for controlled/uncontrolled
  const [internalValue, setInternalValue] = React.useState(defaultValue)

  const currentValue = value !== undefined ? value : internalValue

  // Default prefix/suffix for search variant
  const defaultPrefix =
    variant === 'search' ? <IconMagnifyingglass size={14} className="h-5 w-5" /> : prefix
  const defaultSuffix =
    variant === 'search' ? (
      <div className="flex gap-2">
        <div className="bg-background-3 flex h-5 w-5 items-center justify-center rounded-[2px]">
          <IconCommand className="h-4 w-4" />
        </div>
        <div className="bg-background-3 flex h-5 w-5 items-center justify-center rounded-[2px]">
          <span className="typo-body-sm-medium text-neutral-80">F</span>
        </div>
      </div>
    ) : (
      suffix
    )

  // Character counter
  const characterCounter =
    showCharacterCount && maxLength ? (
      <div className={cn('text-neutral-80 text-xs', disabled && 'text-content-dark-4')}>
        {String(currentValue !== undefined && currentValue !== null ? currentValue : '').length}/
        {maxLength}
      </div>
    ) : null

  // Final suffix with character counter + original suffix
  const finalSuffix = (
    <>
      {characterCounter}
      {defaultSuffix && characterCounter && <div className="bg-border-1 mx-1 h-4 w-px" />}
      {defaultSuffix}
    </>
  )

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newValue = e.target.value

    if (allowNegative === false) {
      newValue = newValue.replace(/-/g, '')
    }

    if (value === undefined) {
      setInternalValue(newValue)
    }
    onChange?.(newValue)
  }

  const handleFocus = () => {
    onFocus?.()
  }

  const handleBlur = () => {
    onBlur?.()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (allowNegative === false && e.key === '-') {
      e.preventDefault()
    }

    if (onlyNumber) {
      const allowedKeys = [
        'Backspace',
        'Tab',
        'Enter',
        'Escape',
        'Delete',
        'ArrowLeft',
        'ArrowRight',
        'ArrowUp',
        'ArrowDown',
        'Home',
        'End',
      ]
      const isNumber = /^[0-9]$/.test(e.key)
      const isModifier = e.ctrlKey || e.metaKey || e.altKey

      if (!isNumber && !allowedKeys.includes(e.key) && !isModifier) {
        e.preventDefault()
      }
    }
    onKeyDown?.(e)
  }

  return (
    <div className={`flex w-full flex-col gap-2 ${className}`}>
      {/* Label */}
      {(label || subtitle) && (
        <div className="flex flex-col gap-1">
          {label && (
            <div className="flex items-start gap-1.5">
              <label
                htmlFor={_id}
                className={cn(
                  'typo-body-base-semibold text-neutral-90',
                  size === 'compact' && 'text-sm'
                )}
              >
                {label}
              </label>
              {required && (
                <span
                  className={cn(
                    'typo-body-base-semibold text-action-primary-red-default',
                    size === 'compact' && 'text-sm'
                  )}
                >
                  *
                </span>
              )}
              {labelAction}
            </div>
          )}
          {subtitle && (
            <span
              className={cn(
                'typo-body-base-regular text-neutral-80',
                size === 'compact' && 'text-xs'
              )}
            >
              {subtitle}
            </span>
          )}
        </div>
      )}

      {/* Input Container */}
      <div
        className={cn(
          'bg-data-light-grey-default',
          'relative flex items-center rounded border',
          size === 'compact' ? 'h-8 gap-2 px-2 py-1.5' : 'h-10 gap-3 px-3 py-2.5',
          'border-neutral-60 hover:border-neutral-80 focus-within:!border-neutral-100', // #d8d8d8, hover: #878787, focus: #000000, disabled: #d8d8d8
          disabled && 'border-neutral-60 bg-data-light-grey-disabled hover:border-neutral-60',
          error &&
            'border-data-red-default hover:border-data-red-default focus-within:!border-data-red-default', // #af2323, disabled overrides
          isValid &&
            'border-data-green-default hover:border-data-green-default focus-within:!border-data-green-default', // #2f9e47, disabled overrides
          disabled ? 'cursor-not-allowed' : 'cursor-text'
        )}
      >
        {/* Prefix */}
        {defaultPrefix && <div className="text-neutral-80 shrink-0">{defaultPrefix}</div>}

        {/* Input Field */}
        <input
          ref={ref}
          id={_id}
          name={name}
          type={type}
          step={step}
          aria-label={ariaLabel}
          value={currentValue !== undefined && currentValue !== null ? currentValue : ''}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          autoFocus={autoFocus}
          autoComplete={autoComplete || 'off'}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          min={type === 'number' && allowNegative === false ? 0 : undefined}
          className={cn(
            size === 'compact' ? 'text-xs' : 'text-sm',
            // `min-w-0` is load-bearing next to `flex-1`: a flex item's default `min-width:auto`
            // resolves to an input's intrinsic size (~20 characters), so in a narrow column the
            // input refuses to shrink and shoves the suffix ("%", "VND") outside the border box.
            'placeholder:text-neutral-80 min-w-0 flex-1 border-none bg-transparent outline-none',
            disabled ? 'cursor-not-allowed' : 'cursor-text',
            disabled
              ? 'text-content-dark-4'
              : String(currentValue !== undefined && currentValue !== null ? currentValue : '')
                    .length > 0
                ? 'text-neutral-90'
                : 'text-neutral-80',
            readOnly ? 'cursor-default' : ''
          )}
        />

        {/* Suffix */}
        {finalSuffix && (
          <div className={cn('text-neutral-80 shrink-0', disabled && 'text-content-dark-4')}>
            {finalSuffix}
          </div>
        )}
      </div>

      <FormCaption caption={caption} error={error} disabled={disabled} />
    </div>
  )
})

TextField.displayName = 'TextField'
