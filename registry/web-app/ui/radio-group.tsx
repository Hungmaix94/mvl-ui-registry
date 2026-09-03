import * as React from 'react'
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group'

import { cn } from '@/utils'
import { FormCaption } from '../ui/form'

export type RadioGroupProps = React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root> & {
  id: string
  label: string
  hiddenLabel?: boolean
  error?: string
  disabled: boolean
  /**
   * `disabled` trên từng option để tắt một lựa chọn mà vẫn giữ nó trong danh sách — người dùng
   * cần THẤY lựa chọn đó tồn tại rồi mới hiểu vì sao mình không chọn được. Bỏ hẳn option đi
   * thì màn hình lặng lẽ đổi số lựa chọn giữa các bản ghi, và người dùng tưởng tính năng biến mất.
   */
  options: { value: string; label: string; disabled?: boolean }[]
  onChange?: (value: string) => void
}

const RadioGroup = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Root>,
  RadioGroupProps
>(
  (
    {
      className,
      options,
      label,
      hiddenLabel,
      id,
      required,
      orientation,
      onChange,
      error,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <div className={`flex h-full w-full flex-col gap-2`}>
        {/* Label */}
        {!hiddenLabel && label && (
          <div className="flex items-center gap-0.5">
            <label htmlFor={id} className="typo-body-base-semibold text-neutral-90">
              {label}
            </label>
            {required && (
              <span className="typo-body-base-semibold text-action-primary-red-default">*</span>
            )}
          </div>
        )}
        <RadioGroupPrimitive.Root
          className={cn('flex flex-1 flex-row flex-wrap gap-[26px]', className)}
          onValueChange={onChange}
          disabled={disabled}
          {...props}
          ref={ref}
        >
          {options.map((option) => {
            // Namespace the option's DOM id with the group `id` so that rendering several
            // RadioGroups on one page (e.g. per-criterion ratings) does not collide — without
            // it, duplicate ids make clicking an option label toggle the first group's radio.
            const optionId = `${id}-${option.value}`
            const isOptionDisabled = disabled || !!option.disabled
            return (
              <div
                key={option.value}
                className={cn(
                  'flex items-center gap-2 py-[6px]',
                  isOptionDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                )}
              >
                <RadioGroupPrimitive.Item
                  value={option.value}
                  id={optionId}
                  disabled={isOptionDisabled}
                  className="border-border-2 data-[state=checked]:border-action-primary-red-default relative m-0 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 bg-transparent p-0 outline-none disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <RadioGroupPrimitive.Indicator className="absolute -inset-[2px] flex items-center justify-center">
                    <svg
                      className="text-action-primary-red-default h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="none"
                    >
                      <circle
                        cx="10"
                        cy="10"
                        r="9"
                        stroke="currentColor"
                        strokeWidth="2"
                        fill="white"
                      />
                      <circle cx="10" cy="10" r="4.5" fill="currentColor" />
                    </svg>
                  </RadioGroupPrimitive.Indicator>
                </RadioGroupPrimitive.Item>
                <label
                  htmlFor={optionId}
                  className={cn(
                    'typo-body-base-regular text-content-dark-1',
                    isOptionDisabled ? 'cursor-not-allowed opacity-70' : ''
                  )}
                >
                  {option.label}
                </label>
              </div>
            )
          })}
        </RadioGroupPrimitive.Root>
        <FormCaption error={error} disabled={disabled} />
      </div>
    )
  }
)
RadioGroup.displayName = RadioGroupPrimitive.Root.displayName

const RadioGroupItem = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>
>(({ className, ...props }, ref) => {
  return (
    <RadioGroupPrimitive.Item
      ref={ref}
      className={cn(
        'border-border-2 data-[state=checked]:border-action-primary-red-default relative m-0 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 bg-transparent p-0 outline-none disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator className="absolute -inset-[2px] flex items-center justify-center">
        <svg className="text-action-primary-red-default h-5 w-5" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="2" fill="white" />
          <circle cx="10" cy="10" r="4.5" fill="currentColor" />
        </svg>
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  )
})
RadioGroupItem.displayName = RadioGroupPrimitive.Item.displayName

export { RadioGroup, RadioGroupItem }
