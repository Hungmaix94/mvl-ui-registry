import { IconCheck, IconWarningcircle, IconInfo } from '@/assets/icons'
import { formatCurrencyVND } from '@/utils/common'

type Props = {
  isFullyAllocated: boolean
  remaining: number
  totalAmount: number
  totalAllocated: number
  showActions: boolean
  isLoadingSuggest: boolean
  onSuggest: () => void
  onSetAllTo100: () => void
}

export function AllocationBanner({
  isFullyAllocated,
  remaining,
  totalAmount,
  totalAllocated,
  showActions,
  isLoadingSuggest,
  onSuggest,
  onSetAllTo100,
}: Props) {
  return (
    <div
      className={`flex items-start gap-3.5 rounded-md border p-3.5 ${
        !isFullyAllocated
          ? 'border-irish-30 bg-irish-10 text-irish-800'
          : remaining === 0
            ? 'border-green-30 bg-green-10 text-green-800'
            : // Chênh lệch thu là thông tin, không phải lỗi — cam chứ không đỏ.
              'border-orange-30 bg-orange-10 text-orange-800'
      }`}
    >
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white shadow-sm">
        {!isFullyAllocated ? (
          <IconInfo style={{ width: 16, height: 16 }} className="text-data-irish-default" />
        ) : remaining === 0 ? (
          <IconCheck className="text-data-green-default h-4 w-4" />
        ) : (
          <IconInfo style={{ width: 16, height: 16 }} className="text-data-orange-default" />
        )}
      </div>
      <div>
        <div className="mb-0.5 text-sm font-semibold">
          {!isFullyAllocated && 'Nhập số tiền phân bổ cho từng hóa đơn'}
          {isFullyAllocated && remaining === 0 && 'Tiền thực nhận khớp mệnh giá tất toán'}
          {/* Lệch KHÔNG phải lỗi: CĐT chuyển thiếu/thừa vài đồng thì phần lệch treo thành công
              nợ vụn, còn hoá đơn vẫn được tất toán ĐỦ mặt — đó mới là thứ giữ ir_cash_ratio
              về được 1 và giải phóng hoa hồng. Chỉ khi lệch lớn thì bước ghi sổ mới hỏi lại. */}
          {isFullyAllocated &&
            remaining > 0 &&
            `Thu thừa ${formatCurrencyVND(remaining)} ₫ so với mệnh giá tất toán`}
          {isFullyAllocated &&
            remaining < 0 &&
            `Thu thiếu ${formatCurrencyVND(-remaining)} ₫ — treo công nợ vụn`}
        </div>
        <div className="text-[13px] leading-snug opacity-90">
          {totalAmount > 0 || totalAllocated > 0 ? (
            <>
              Tiền thực nhận <b>{formatCurrencyVND(totalAmount)} ₫</b> · Mệnh giá tất toán{' '}
              <b>{formatCurrencyVND(totalAllocated)} ₫</b>.
            </>
          ) : (
            'Vui lòng nhập tổng số tiền ở Bước 1'
          )}
        </div>
      </div>
      {showActions && (
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            className="border-border-1 inline-flex items-center justify-center gap-2 rounded-md border bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
            onClick={onSuggest}
            disabled={isLoadingSuggest}
          >
            <IconWarningcircle style={{ width: 12, height: 12 }} /> Gợi ý chia tỷ lệ
          </button>
          <button
            type="button"
            className="border-border-1 inline-flex items-center justify-center gap-2 rounded-md border bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
            onClick={onSetAllTo100}
          >
            Mỗi hóa đơn 100%
          </button>
        </div>
      )}
    </div>
  )
}
