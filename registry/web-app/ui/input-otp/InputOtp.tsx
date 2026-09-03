import React, { useRef, useEffect, useImperativeHandle, forwardRef } from 'react'
import { cn } from '@/utils'

export interface InputOtpProps {
  value?: string[]
  onChange?: (value: string[]) => void
  length?: number
  disabled?: boolean
  autoFocus?: boolean
  className?: string
  placeholder?: string
  error?: boolean
  isValid?: boolean
  onInputFocus?: (index: number) => void
}

export interface InputOtpRef {
  focusInputByIndex: (index: number) => void
}

export const InputOtp = forwardRef<InputOtpRef, InputOtpProps>(
  (
    {
      onChange,
      value = [],
      length = 6,
      disabled = false,
      autoFocus = false,
      className = '',
      placeholder = '',
      error = false,
      isValid = false,
      onInputFocus,
    },
    ref
  ) => {
    const inputRefs = useRef<(HTMLInputElement | null)[]>([])
    const lastFocusedIndex = useRef<number>(0)
    // Ensure we always have an array of the correct length
    const currentValue = Array.from({ length }, (_, index) => value[index] || '')

    // Expose focusInputByIndex method to parent component
    useImperativeHandle(
      ref,
      () => ({
        focusInputByIndex: (index: number) => {
          if (inputRefs.current[index]) {
            inputRefs.current[index]?.focus()
            const inputLength = inputRefs.current[index]?.value.length || 0
            inputRefs.current[index]?.setSelectionRange(inputLength, inputLength)
          }
        },
      }),
      []
    )

    useEffect(() => {
      if (autoFocus && inputRefs.current[0]) {
        inputRefs.current[0].focus()
      }
    }, [autoFocus])

    const handleInputChange = (index: number, inputValue: string) => {
      if (disabled) return

      const newValue = [...currentValue]

      // Handle both typing and deleting
      if (inputValue.length > 0) {
        // User is typing - take the last character
        newValue[index] = inputValue.slice(-1)
      } else {
        // User is deleting - clear the value
        newValue[index] = ''
      }

      // Ensure array has correct length
      const paddedValue = Array.from({ length }, (_, i) => newValue[i] || '')
      onChange?.(paddedValue)

      // Auto-focus next input when user types a digit
      if (inputValue && index < length - 1) {
        const nextInput = inputRefs.current[index + 1]
        if (nextInput) {
          nextInput.focus()
          lastFocusedIndex.current = index + 1
          // Set cursor to end of next input
          setTimeout(() => {
            const length = nextInput.value.length
            nextInput.setSelectionRange(length, length)
          }, 0)
        }
      }
    }

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (disabled) return

      if (e.key === 'Backspace') {
        if (currentValue[index]) {
          // If current input has value, clear it
          const newValue = [...currentValue]
          newValue[index] = ''
          const paddedValue = Array.from({ length }, (_, i) => newValue[i] || '')
          onChange?.(paddedValue)
        } else if (index > 0) {
          // If current input is empty, focus previous input
          const prevInput = inputRefs.current[index - 1]
          if (prevInput) {
            prevInput.focus()
            lastFocusedIndex.current = index - 1
            // Set cursor to end of previous input
            setTimeout(() => {
              const length = prevInput.value.length
              prevInput.setSelectionRange(length, length)
            }, 0)
          }
        }
      } else if (e.key === 'ArrowLeft' && index > 0) {
        const prevInput = inputRefs.current[index - 1]
        if (prevInput) {
          prevInput.focus()
          lastFocusedIndex.current = index - 1
          // Set cursor to end of previous input
          setTimeout(() => {
            const length = prevInput.value.length
            prevInput.setSelectionRange(length, length)
          }, 0)
        }
      } else if (e.key === 'ArrowRight' && index < length - 1) {
        const nextInput = inputRefs.current[index + 1]
        if (nextInput) {
          nextInput.focus()
          lastFocusedIndex.current = index + 1
          // Set cursor to end of next input
          setTimeout(() => {
            const length = nextInput.value.length
            nextInput.setSelectionRange(length, length)
          }, 0)
        }
      }
    }

    const handlePaste = (e: React.ClipboardEvent) => {
      if (disabled) return

      e.preventDefault()
      const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)

      if (pastedData) {
        const pastedArray = pastedData.split('')
        // Ensure array has correct length
        const paddedArray = Array.from({ length }, (_, i) => pastedArray[i] || '')
        onChange?.(paddedArray)

        // Focus the next empty input or the last input
        const nextIndex = Math.min(pastedData.length, length - 1)
        const targetInput = inputRefs.current[nextIndex]
        if (targetInput) {
          targetInput.focus()
          // Set cursor to end of target input
          setTimeout(() => {
            const length = targetInput.value.length
            targetInput.setSelectionRange(length, length)
          }, 0)
        }
      }
    }

    const handleInputFocus = (index: number) => {
      lastFocusedIndex.current = index
      onInputFocus?.(index)

      // Set cursor position to the end of the input content
      setTimeout(() => {
        const input = inputRefs.current[index]
        if (input) {
          const length = input.value.length
          input.setSelectionRange(length, length)
        }
      }, 0)
    }

    return (
      <div className={cn('flex w-full justify-between gap-2', className)}>
        {Array.from({ length }, (_, index) => (
          <div
            key={index}
            className={cn(
              'relative flex h-16 w-16 items-center justify-center',
              'bg-data-light-grey-default rounded border',
              'transition-colors duration-200',
              // Default state
              'border-neutral-60 hover:border-neutral-80 focus-within:border-neutral-100 focus-within:ring-2 focus-within:ring-neutral-100/20',
              // Filled state - based on value
              currentValue[index] && 'border-neutral-100',
              // Valid state
              isValid && currentValue[index] && 'border-data-green-default',
              // Error state
              error &&
                'border-data-red-default hover:border-data-red-default focus-within:border-data-red-default',
              // Disabled state
              disabled && 'border-neutral-60 bg-data-light-grey-disabled cursor-not-allowed'
            )}
          >
            <input
              ref={(el) => {
                inputRefs.current[index] = el
              }}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              value={currentValue[index] || ''}
              onChange={(e) => handleInputChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={handlePaste}
              onFocus={() => handleInputFocus(index)}
              disabled={disabled}
              placeholder={placeholder}
              data-otp-input
              className={cn(
                'h-full w-full text-center text-2xl font-medium',
                'border-none bg-transparent outline-none',
                'text-neutral-90 placeholder:text-neutral-80',
                disabled && 'text-content-dark-4 cursor-not-allowed',
                error && 'text-data-red-default',
                isValid && currentValue[index] && 'text-data-green-default'
              )}
            />
          </div>
        ))}
      </div>
    )
  }
)
