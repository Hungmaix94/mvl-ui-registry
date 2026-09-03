import { type ChangeEvent } from 'react'
import FullCellNumberInput from '@/components/commons/FullCellNumberInput'
import { cn } from '@/utils'

interface LadRateInputProps {
  value: number | null
  /** '%' (0–100) or 'đ' (amount). */
  suffix: '%' | 'đ'
  onChange: (next: number | null) => void
  disabled?: boolean
  className?: string
  isError?: boolean
  /**
   * Số chữ số thập phân tối đa. Mặc định 3 — đúng cụm F2 (`pct_f2_*` là numeric(6,3)), là
   * consumer còn lại của component này. Ma trận cấu hình CĐT truyền 10 vì ba tỷ lệ lõi
   * (doanh thu / phí trả sale / phí đại lý) đã lên numeric(14,10) ngày 26/08/2026.
   */
  maxFractionDigits?: number
}

/**
 * Number input for the LAD config (Bước 2) — wraps {@link FullCellNumberInput} with a bordered cell
 * and the `%`/`đ` suffix. Emits `number | null` (parent stores pct_* OR amt_* in payload_snapshot).
 */
export function LadRateInput({
  value,
  suffix,
  onChange,
  disabled,
  className,
  isError,
  maxFractionDigits = 3,
}: LadRateInputProps) {
  return (
    <div className={cn('w-[150px]', className)}>
      <FullCellNumberInput
        value={value ?? ''}
        suffix={suffix}
        min={0}
        max={suffix === '%' ? 100 : undefined}
        maxFractionDigits={maxFractionDigits}
        disabled={disabled}
        isError={isError}
        inputWrapperClassName="border-border-1 rounded-md border-[1px]"
        className="typo-body-sm-medium min-h-[38px]"
        onChange={(e: ChangeEvent<HTMLInputElement>) => {
          const raw = e.target.value
          onChange(raw === '' ? null : Number(raw))
        }}
      />
    </div>
  )
}

export default LadRateInput
