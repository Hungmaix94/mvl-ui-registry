import { useState, useEffect, type ReactNode } from 'react'
import { Controller, UseFormReturn } from 'react-hook-form'
import { TextField, CurrencyInput } from '@/components/ui'

export interface FormCombinedRateFieldProps {
  form: UseFormReturn<any>
  pctName: string
  amtName: string
  label: ReactNode
  pctOnly?: boolean
  disabled?: boolean
  className?: string
}

export function FormCombinedRateField({
  form,
  pctName,
  amtName,
  label,
  pctOnly = false,
  disabled = false,
  className,
}: FormCombinedRateFieldProps) {
  const amtValue = form.watch(amtName)
  const isDirty = form.formState.isDirty

  const [type, setType] = useState<'pct' | 'amt'>(
    pctOnly ? 'pct' : amtValue !== null && amtValue !== undefined && amtValue !== '' ? 'amt' : 'pct'
  )

  useEffect(() => {
    if (!isDirty && !pctOnly) {
      const currentAmt = form.getValues(amtName)
      setType(currentAmt !== null && currentAmt !== undefined && currentAmt !== '' ? 'amt' : 'pct')
    }
  }, [isDirty, pctOnly, form, amtName])

  const handleTypeChange = (newType: 'pct' | 'amt') => {
    if (pctOnly) return
    if (newType === type) return
    setType(newType)
    if (newType === 'pct') {
      form.setValue(amtName, null, { shouldDirty: true })
    } else {
      form.setValue(pctName, null, { shouldDirty: true })
    }
  }

  const suffixNode = (
    <div className="-mr-3 flex items-center">
      <button
        type="button"
        disabled={pctOnly || disabled}
        className={`typo-body-base-regular border-neutral-20 min-w-[48px] border-l px-2 text-center transition-colors focus:outline-none ${
          pctOnly || disabled
            ? 'cursor-not-allowed text-neutral-400'
            : 'cursor-pointer text-blue-500 hover:text-blue-700'
        }`}
        onClick={() => handleTypeChange(type === 'pct' ? 'amt' : 'pct')}
        title={pctOnly ? 'Chỉ hỗ trợ %' : 'Nhấn để chuyển đổi giữa % và VNĐ'}
      >
        {type === 'pct' ? '%' : 'VNĐ'}
      </button>
    </div>
  )

  return (
    <div className={`flex-1 ${className || ''}`}>
      {type === 'pct' ? (
        <Controller
          control={form.control}
          name={pctName}
          render={({ field, fieldState }) => (
            <TextField
              {...field}
              value={field.value ?? ''}
              onChange={(val: any) => {
                let str = val?.toString() || ''
                if (Number(str) > 100) str = '100'
                if (str.includes('.')) {
                  const parts = str.split('.')
                  if (parts[1].length > 3) {
                    str = parts[0] + '.' + parts[1].slice(0, 3)
                  }
                }
                field.onChange(str === '' ? null : str)
              }}
              type="number"
              step="any"
              allowNegative={false}
              placeholder="Nhập tỷ lệ..."
              label={label}
              disabled={disabled}
              error={fieldState.error?.message}
              suffix={suffixNode}
              className="[&_input]:[appearance:textfield] [&_input::-webkit-inner-spin-button]:appearance-none [&_input::-webkit-outer-spin-button]:appearance-none"
            />
          )}
        />
      ) : (
        <Controller
          control={form.control}
          name={amtName}
          render={({ field, fieldState }) => (
            <CurrencyInput
              {...field}
              value={field.value ?? ''}
              allowNegative={false}
              onChange={(val: any) => field.onChange(val === '' || val === undefined ? null : val)}
              placeholder="Nhập số tiền..."
              label={label}
              disabled={disabled}
              error={fieldState.error?.message}
              suffix={suffixNode}
            />
          )}
        />
      )}
    </div>
  )
}
