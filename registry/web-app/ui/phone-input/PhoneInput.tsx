import React, { useMemo } from 'react'
import { cn } from '@/utils'
import { FormCaption } from '../../ui/form'

export interface PhoneInputProps {
  label?: string
  subtitle?: string
  required?: boolean
  placeholder?: string
  value?: string
  defaultValue?: string
  caption?: string
  isValid?: boolean
  error?: string
  showCharacterCount?: boolean
  maxLength?: number
  disabled?: boolean
  readOnly?: boolean
  autoFocus?: boolean
  onChange?: (value: string) => void
  onFocus?: () => void
  onBlur?: () => void
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
  className?: string
  id?: string
  name?: string
  defaultCountry?: string
  countries?: string[]
}

export interface PhoneInputRef {
  focus: () => void
}

const countryCodes: Record<string, string> = {
  VN: '+84',
  US: '+1',
  GB: '+44',
  FR: '+33',
  DE: '+49',
  JP: '+81',
  CN: '+86',
  KR: '+82',
  TH: '+66',
  SG: '+65',
  MY: '+60',
  PH: '+63',
  ID: '+62',
  AU: '+61',
  IN: '+91',
}

export const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(function PhoneInput(
  {
    label,
    subtitle,
    required = false,
    placeholder,
    value,
    defaultValue = '',
    caption,
    error,
    isValid,
    showCharacterCount = false,
    maxLength = 15,
    disabled = false,
    readOnly = false,
    autoFocus = false,
    onChange,
    onFocus,
    onBlur,
    onKeyDown,
    className = '',
    id,
    name,
    defaultCountry = 'VN',
    countries = ['VN'],
  },
  ref
) {
  const _id = useMemo(() => `${id}_${name}_${Date.now()}`, [id, name])

  const [internalValue, setInternalValue] = React.useState(defaultValue)
  const currentValue = value !== undefined ? value : internalValue

  const selectedCountry = countries[0] || defaultCountry
  const countryCode = countryCodes[selectedCountry] || '+84'

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value.replace(/[^\d]/g, '')

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

  const characterCounter =
    showCharacterCount && maxLength ? (
      <div className={cn('text-neutral-80 text-xs', disabled && 'text-content-dark-4')}>
        {(currentValue || '').length}/{maxLength}
      </div>
    ) : null

  const finalSuffix = characterCounter ? <>{characterCounter}</> : null

  return (
    <div className={`flex w-full flex-col gap-2 ${className}`}>
      {(label || subtitle) && (
        <div className="flex flex-col gap-1">
          {label && (
            <div className="flex items-center gap-0.5">
              <label htmlFor={_id} className={cn('typo-body-base-semibold text-neutral-90')}>
                {label}
              </label>
              {required && (
                <span className="typo-body-base-semibold text-action-primary-red-default">*</span>
              )}
            </div>
          )}
          {subtitle && <span className="typo-body-base-regular text-neutral-80">{subtitle}</span>}
        </div>
      )}

      <div
        className={cn(
          'bg-data-light-grey-default',
          'relative flex items-center rounded border',
          'h-10 gap-3 px-3 py-2.5',
          'border-neutral-60 hover:border-neutral-80 focus-within:!border-neutral-100',
          disabled && 'border-neutral-60 bg-data-light-grey-disabled hover:border-neutral-60',
          error &&
            'border-data-red-default hover:border-data-red-default focus-within:!border-data-red-default',
          isValid &&
            'border-data-green-default hover:border-data-green-default focus-within:!border-data-green-default',
          disabled ? 'cursor-not-allowed' : 'cursor-text'
        )}
      >
        <div className="flex items-center gap-2">
          <span className="typo-body-base-regular text-neutral-80 shrink-0">{countryCode}</span>
          <div className="bg-border-1 h-4 w-px" />
        </div>

        <input
          ref={ref}
          id={_id}
          name={name}
          type="tel"
          value={currentValue || ''}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          autoFocus={autoFocus}
          autoComplete="tel"
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={onKeyDown}
          className={cn(
            'text-sm',
            'placeholder:text-neutral-80 flex-1 border-none bg-transparent outline-none',
            disabled ? 'cursor-not-allowed' : 'cursor-text',
            disabled
              ? 'text-content-dark-4'
              : (currentValue || '').length > 0
                ? 'text-neutral-90'
                : 'text-neutral-80',
            readOnly ? 'cursor-default' : ''
          )}
        />

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

PhoneInput.displayName = 'PhoneInput'
