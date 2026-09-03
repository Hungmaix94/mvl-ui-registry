import { useEffect, useState, type ReactNode } from 'react'
import { UseFormReturn } from 'react-hook-form'

import MoneyPercentInput, { type MoneyPercentMode } from '@/components/commons/MoneyPercentInput'
import { FormCaption } from '@/components/ui/form'
import { cn } from '@/utils'

export interface FormMoneyPercentFieldProps {
  form: UseFormReturn<any>
  /** Tên field tỷ lệ % (bắt buộc). */
  pctName: string
  /** Tên field số tiền (₫) — XOR với `pctName`. Bỏ trống khi chỉ nhập %. */
  amtName?: string
  /** Nhãn hiển thị phía trên ô (cùng style với RateInput). */
  label?: ReactNode
  required?: boolean
  /** Chỉ cho nhập % (ẩn nút đ); không cần `amtName`. */
  pctOnly?: boolean
  /** Chỉ cho nhập số tiền (ẩn nút %); dùng cho khoản không có tỷ lệ, ví dụ Thưởng MV. */
  amtOnly?: boolean
  disabled?: boolean
  isError?: boolean
  placeholder?: string
  /** Lớp bọc ngoài (label + input). */
  className?: string
}

const toNum = (v: unknown): number | null => {
  if (v == null || v === '') return null
  const n = Number(v)
  return Number.isNaN(n) ? null : n
}

/**
 * RHF field: ô nhập **tỷ lệ / số tiền** với công tắc `[đ | %]` gắn liền mép phải ({@link MoneyPercentInput}).
 *
 * Giữ cặp `pct`/`amt` dạng XOR (một field luôn null). Đổi đơn vị ⇒ XOÁ field kia, **KHÔNG quy đổi** —
 * phù hợp form cấu hình (template) không có "giá" để quy đổi %↔đ; khác với
 * `ReconPctAmountInline` (quy đổi theo feeCalculationPrice). `pctOnly` ⇒ chỉ %, ẩn nút đ.
 *
 * Mode lưu cục bộ (giống FormCombinedRateField): seed theo field amt có giá trị, reset theo data khi
 * form chưa dirty — nhờ vậy bấm "đ" lúc ô trống vẫn giữ được mode để nhập.
 */
export function FormMoneyPercentField({
  form,
  pctName,
  amtName,
  label,
  required,
  pctOnly = false,
  amtOnly = false,
  disabled = false,
  isError,
  placeholder,
  className,
}: FormMoneyPercentFieldProps) {
  const hasAmount = !pctOnly && !!amtName
  const amtVal = hasAmount ? form.watch(amtName as string) : null
  const pctVal = form.watch(pctName)
  const isDirty = form.formState.isDirty

  const [mode, setMode] = useState<MoneyPercentMode>(
    amtOnly || (hasAmount && toNum(amtVal) != null) ? 'amount' : 'percent'
  )

  useEffect(() => {
    if (amtOnly) return
    if (!isDirty && hasAmount) {
      setMode(toNum(form.getValues(amtName as string)) != null ? 'amount' : 'percent')
    }
  }, [isDirty, hasAmount, amtName, form])

  const value = mode === 'amount' ? toNum(amtVal) : toNum(pctVal)

  const handleValueChange = (next: number | null) => {
    form.setValue(mode === 'amount' ? (amtName as string) : pctName, next, { shouldDirty: true })
  }

  const handleModeChange = (next: MoneyPercentMode) => {
    if (!hasAmount || next === mode) return
    setMode(next)
    // Đổi đơn vị ⇒ xoá field kia (KHÔNG quy đổi).
    if (next === 'amount') form.setValue(pctName, null, { shouldDirty: true })
    else form.setValue(amtName as string, null, { shouldDirty: true })
  }

  const pctError = form.formState.errors[pctName]?.message as string | undefined
  const amtError = amtName
    ? (form.formState.errors[amtName]?.message as string | undefined)
    : undefined
  const errorMessage = pctError || amtError

  return (
    <div className={cn('flex w-full flex-col gap-2', className)}>
      {label && (
        <label className="typo-body-base-semibold text-neutral-90">
          {label}
          {required && <span className="text-action-primary-red-default ml-0.5">*</span>}
        </label>
      )}
      <MoneyPercentInput
        mode={mode}
        value={value}
        pctOnly={pctOnly}
        onlyMode={amtOnly ? 'amount' : undefined}
        disabled={disabled}
        isError={isError || !!errorMessage}
        placeholder={placeholder}
        onValueChange={handleValueChange}
        onModeChange={handleModeChange}
      />
      <FormCaption error={errorMessage} disabled={disabled} />
    </div>
  )
}

export default FormMoneyPercentField
