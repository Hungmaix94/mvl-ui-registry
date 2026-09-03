import React from 'react'
import { Property } from 'csstype'
import { cn } from '@/utils'
import { FormCaption } from '@/components/ui/form'

export interface TextAreaProps {
  // Label
  label?: string
  required?: boolean

  // Input content
  placeholder?: string
  value?: string
  defaultValue?: string

  // Suffix (character count)
  maxCharacters?: number

  // Caption
  caption?: string

  // States
  isValid?: boolean
  error?: string

  // HTML attributes
  disabled?: boolean
  readOnly?: boolean
  autoFocus?: boolean

  // Rows and resize
  rows?: number
  maxRows?: number
  resize?: Property.Resize

  // Event handlers
  onChange?: (value: string) => void
  onFocus?: () => void
  onBlur?: () => void

  // Additional props
  className?: string
  id?: string
  name?: string
}

export const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(
  (
    {
      label = '',
      required = false,
      placeholder = '',
      value,
      defaultValue = '',
      maxCharacters = undefined,
      caption,
      isValid,
      error,
      disabled = false,
      readOnly = false,
      autoFocus = false,
      rows = 4,
      resize = 'none',
      onChange,
      onFocus,
      onBlur,
      className,
      id,
      name,
    },
    ref
  ) => {
    // Handle internal state for controlled/uncontrolled
    const [internalValue, setInternalValue] = React.useState(defaultValue)

    const currentValue = value !== undefined ? (value ?? '') : internalValue

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value

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

    const safeValue = currentValue ?? ''

    return (
      <div className={`flex w-full flex-col gap-2 ${className}`}>
        {/* Label */}
        {label && (
          <div className="flex items-center gap-0.5">
            <label htmlFor={id} className="typo-body-base-semibold text-neutral-90">
              {label}
            </label>
            {required && (
              <span className="typo-body-base-semibold text-action-primary-red-default">*</span>
            )}
          </div>
        )}

        {/* TextArea Container */}
        <div
          className={cn(
            'relative flex',
            'min-h-32',
            'rounded border',
            'border-neutral-60 hover:border-neutral-80 focus-within:!border-neutral-100',
            error &&
              'border-data-red-default hover:border-data-red-default focus-within:!border-data-red-default',
            isValid &&
              'border-data-green-default hover:border-data-green-default focus-within:!border-data-green-default',
            disabled
              ? 'bg-data-light-grey-disabled hover:border-neutral-60'
              : 'bg-data-light-grey-default'
          )}
        >
          {/* TextArea Field */}
          <textarea
            ref={ref}
            id={id}
            name={name}
            value={safeValue}
            placeholder={placeholder}
            disabled={disabled}
            readOnly={readOnly}
            autoFocus={autoFocus}
            rows={rows}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            style={{ resize: resize }}
            className={cn(
              'px-3 py-2.5',
              'flex-1 resize-none border-none bg-transparent outline-none',
              'text-sm leading-[1.5]',
              disabled ? 'cursor-not-allowed' : 'cursor-text',
              disabled
                ? 'text-content-dark-4'
                : safeValue.length > 0
                  ? 'text-neutral-90'
                  : 'text-neutral-80',
              readOnly ? 'cursor-default' : ''
            )}
          />

          {/* Suffix (Character count) */}
          {maxCharacters && (
            <div className="absolute right-2 bottom-[0] text-right">
              <div
                className={cn(
                  'text-xs',
                  'text-neutral-80', // #7d7d7d,
                  disabled && 'text-content-dark-4' // disabled: #b5b5b5
                )}
              >
                {safeValue.length}/{maxCharacters}
              </div>
            </div>
          )}
        </div>
        <FormCaption caption={caption} error={error} disabled={disabled} />
      </div>
    )
  }
)

TextArea.displayName = 'TextArea'
