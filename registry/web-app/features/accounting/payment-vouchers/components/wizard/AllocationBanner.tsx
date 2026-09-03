import { IconCheck, IconWarningcircle, IconInfo } from '@/assets/icons'
import { formatCurrencyVND } from '@/utils/common'

type Props = {
  isFullyAllocated: boolean
  remaining: number
  totalAmount: number
  totalAllocated: number
  hasSelection: boolean
  onSuggest: () => void
  onSetAllTo100: () => void
}

export function AllocationBanner({
  isFullyAllocated,
  remaining,
  totalAmount,
  totalAllocated,
  hasSelection,
  onSuggest,
  onSetAllTo100,
}: Props) {
  return (
    <div
      className={`flex items-start gap-3.5 rounded-md border p-3.5 ${
        isFullyAllocated
          ? 'border-green-30 bg-green-10 text-green-800'
          : remaining < 0
            ? 'bg-red-10 border-red-30 text-red-800'
            : remaining > 0 && totalAmount > 0
              ? 'border-orange-30 bg-orange-10 text-orange-800'
              : 'border-irish-30 bg-irish-10 text-irish-800'
      }`}
    >
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white shadow-sm">
        {isFullyAllocated ? (
          <IconCheck className="text-data-green-default h-4 w-4" />
        ) : remaining < 0 ? (
          <IconWarningcircle style={{ width: 16, height: 16 }} className="text-data-red-default" />
        ) : remaining > 0 && totalAmount > 0 ? (
          <IconInfo style={{ width: 16, height: 16 }} className="text-data-orange-default" />
        ) : (
          <IconInfo style={{ width: 16, height: 16 }} className="text-data-irish-default" />
        )}
      </div>
      <div>
        <div className="mb-0.5 text-sm font-semibold">
          {isFullyAllocated && 'Đã phân bổ đủ số tiền'}
          {!isFullyAllocated &&
            remaining > 0 &&
            `Còn ${formatCurrencyVND(remaining)} ₫ chưa phân bổ`}
          {!isFullyAllocated &&
            remaining < 0 &&
            `Phân bổ vượt ${formatCurrencyVND(-remaining)} ₫ so với số tiền chi`}
          {!isFullyAllocated &&
            remaining === 0 &&
            totalAmount === 0 &&
            'Nhập số tiền phân bổ cho từng hóa đơn'}
        </div>
        <div className="text-[13px] leading-snug opacity-90">
          {totalAmount > 0 ? (
            <>
              Số tiền chi <b>{formatCurrencyVND(totalAmount)} ₫</b> · Đã phân bổ{' '}
              <b>{formatCurrencyVND(totalAllocated)} ₫</b>.
            </>
          ) : (
            'Vui lòng nhập tổng số tiền ở phần Phương thức thanh toán'
          )}
        </div>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          className="border-border-1 inline-flex items-center justify-center gap-2 rounded-md border bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
          onClick={onSuggest}
          disabled={!hasSelection}
        >
          <IconWarningcircle style={{ width: 12, height: 12 }} /> Gợi ý chia tỷ lệ
        </button>
        <button
          type="button"
          className="border-border-1 inline-flex items-center justify-center gap-2 rounded-md border bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
          onClick={onSetAllTo100}
          disabled={!hasSelection}
        >
          Mỗi hóa đơn 100%
        </button>
      </div>
    </div>
  )
}
