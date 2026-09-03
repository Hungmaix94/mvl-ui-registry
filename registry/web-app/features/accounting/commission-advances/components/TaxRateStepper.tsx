import type { Dispatch, SetStateAction } from 'react'
import { cn } from '@/utils'
import {
  MAX_TAX_ESTIMATE_RATE,
  MIN_TAX_ESTIMATE_RATE,
  TAX_ESTIMATE_RATE_STEP,
  clampTaxRate,
  stepTaxRate,
} from '@/features/accounting/commission-advances/utils/commission-advance-tax-estimate'

type Props = {
  value: number
  /**
   * Nhận nguyên `useState` setter chứ không phải `(next: number) => void`.
   *
   * Hai nút ±5% cộng dồn lên giá trị hiện tại, nên chúng PHẢI cập nhật bằng hàm
   * (`onChange((r) => …)`). Nếu tính sẵn `stepTaxRate(value, delta)` rồi truyền số, mấy lần
   * bấm trong cùng một nhịp render đều đọc chung một `value` cũ và đè lên nhau — bấm nhanh
   * 3 lần từ 15% chỉ xuống 10% thay vì 0%. Đã gặp thật lúc verify.
   */
  onChange: Dispatch<SetStateAction<number>>
  disabled?: boolean
  /** Tên khả truy cập cho ô nhập — nhãn nhóm nằm ở `<span>` riêng nên không vào tên này. */
  ariaLabel: string
}

/**
 * Ô nhập tỷ lệ % kèm hai nút cộng/trừ nhanh, gộp thành MỘT control liền khối.
 *
 * Vì sao không ghép `TextField` + hai `Button` rời: ba thành phần đó không khớp nhau về cả
 * chiều cao (32px vs 35px) lẫn màu viền (`neutral-60` vs `neutral-70` dày 1.5px), nên xếp
 * cạnh nhau trông như ba mảnh vá — BA đã bắt lỗi đúng chỗ này. Ở đây dùng một khung duy nhất,
 * các ô con ngăn nhau bằng đường kẻ, mọi màu lấy từ token của dự án.
 */
export default function TaxRateStepper({ value, onChange, disabled = false, ariaLabel }: Props) {
  const canDecrease = !disabled && value > MIN_TAX_ESTIMATE_RATE
  const canIncrease = !disabled && value < MAX_TAX_ESTIMATE_RATE

  // Hai nút phải RỘNG BẰNG NHAU và bằng nhau ở cả hai đầu, nếu không control trông lệch.
  const stepButtonClass = cn(
    'typo-body-sm-medium text-content-dark-2 flex h-9 w-16 shrink-0 items-center justify-center',
    'transition-colors hover:bg-neutral-30 active:bg-neutral-40',
    'disabled:text-content-dark-4 disabled:cursor-not-allowed disabled:hover:bg-transparent'
  )

  return (
    // `self-start` là bắt buộc: cha là flex-column nên `align-items: stretch` mặc định kéo
    // khung ra hết chiều ngang (đo được 601px cho 189px nội dung) — viền chạy dài quá nội
    // dung, nhìn như control bị lệch trái.
    <div
      className={cn(
        'border-border-1 inline-flex h-9 w-fit shrink-0 items-stretch self-start overflow-hidden rounded-md border bg-white',
        'focus-within:border-neutral-100',
        disabled && 'opacity-60'
      )}
    >
      <button
        type="button"
        aria-label={`Giảm ${TAX_ESTIMATE_RATE_STEP}%`}
        disabled={!canDecrease}
        onClick={() => onChange((rate) => stepTaxRate(rate, -TAX_ESTIMATE_RATE_STEP))}
        className={cn(stepButtonClass, 'border-border-1 border-r')}
      >
        −{TAX_ESTIMATE_RATE_STEP}%
      </button>

      {/* `min-w` cố định để ô giá trị không co giãn khi số nhảy từ 1 sang 3 chữ số — nếu không,
          hai nút hai bên xê dịch mỗi lần bấm. */}
      <div className="flex min-w-[68px] flex-1 items-center justify-center gap-1 px-2">
        <input
          type="text"
          inputMode="numeric"
          aria-label={ariaLabel}
          disabled={disabled}
          value={String(value)}
          onChange={(e) => {
            // Chỉ giữ chữ số: chặn dấu trừ, dấu chấm, chữ cái ngay tại nguồn thay vì
            // để `Number()` trả `NaN` rồi mới cứu ở `clampTaxRate`.
            const digits = e.target.value.replace(/\D/g, '')
            onChange(digits === '' ? MIN_TAX_ESTIMATE_RATE : clampTaxRate(Number(digits)))
          }}
          className="typo-body-base-medium text-content-dark-1 w-8 border-0 bg-transparent p-0 text-right outline-none disabled:cursor-not-allowed"
        />
        <span className="typo-body-base-regular text-content-dark-3 select-none">%</span>
      </div>

      <button
        type="button"
        aria-label={`Tăng ${TAX_ESTIMATE_RATE_STEP}%`}
        disabled={!canIncrease}
        onClick={() => onChange((rate) => stepTaxRate(rate, TAX_ESTIMATE_RATE_STEP))}
        className={cn(stepButtonClass, 'border-border-1 border-l')}
      >
        +{TAX_ESTIMATE_RATE_STEP}%
      </button>
    </div>
  )
}
