import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

import { IconCaretright, IconCurrencycircledollar } from '@/assets/icons'
import { LoadingWrapper } from '@/components'
import { useAdminDashboardSummary } from '@/features/sales/admin-dashboard/services/admin-dashboard-service'
import { cn } from '@/lib/utils'
import { APP_PATH } from '@/routes/AppRoute.constant'
import { formatCurrencyVND } from '@/utils/common'
import { getThisMonthRangeApi } from '@/utils/date-utils'

/**
 * "Đối soát đã xác nhận" — ô duy nhất của Tổng quan Sales KHÔNG chuyển sang tile.
 *
 * Badge của tile là viên tròn vài chục pixel; số tiền ở đây là hàng tỉ, đặt vào badge là chắc chắn
 * phải cắt bớt chữ số — mà một số tiền bị cắt thì đọc thành một số tiền khác.
 *
 * Hình thức là **dải tổng nằm ngang chạy hết bề ngang**, không phải thẻ vuông. Thẻ cũ đứng một
 * mình trong lưới `xl:grid-cols-3` nên chiếm 1/3 và bỏ trống ~870px bên phải, lại cao 140px cho
 * phần nội dung ~70px — nó đọc ra như đồ thừa kẹp giữa cụm tile và biểu đồ. Dải ngang cao ~80px
 * dùng hết bề rộng và đóng vai dòng chốt khép lại cụm tile trước khi sang biểu đồ.
 */
const LABEL = 'Đối soát đã xác nhận'

/**
 * Chiều cao cố định của dải, dùng chung cho cả khung xương.
 *
 * Để chiều cao chạy theo nội dung thì khung xương và dải thật lệch nhau (đo thật: 80 vs 69) và
 * trang giật một cái đúng lúc số đổ vào. Một hằng số cho cả hai nơi ⇒ không thể lệch.
 */
const STRIP_HEIGHT = 72

function SalesConfirmedReconciliationCard() {
  const { data, isLoading } = useAdminDashboardSummary()
  const navigate = useNavigate()
  const month = getThisMonthRangeApi()

  const monthLabel = useMemo(
    () => (data ? `Tháng ${data.month}/${data.year}` : 'Tháng này'),
    [data]
  )

  const goToList = () => {
    const search = new URLSearchParams({
      status: 'confirmed',
      reconciliation_date_from: month.from,
      reconciliation_date_to: month.to,
    }).toString()
    navigate(`${APP_PATH.INVESTOR_RECONCILIATION}?${search}`)
  }

  return (
    <LoadingWrapper
      isLoading={isLoading}
      containerHeight={STRIP_HEIGHT}
      loadingSkeleton={
        <div
          data-testid="confirmed-recon-skeleton"
          aria-busy="true"
          aria-hidden
          style={{ height: STRIP_HEIGHT }}
          className="bg-background-3 w-full rounded-lg"
        />
      }
    >
      <button
        type="button"
        onClick={goToList}
        style={{ minHeight: STRIP_HEIGHT }}
        className={cn(
          'group bg-background-3 hover:bg-background-2 flex w-full items-center gap-4',
          'border-action-primary-red-default rounded-lg border-l-[3px]',
          'py-4 pr-5 pl-4 text-left transition-colors'
        )}
      >
        {/* Icon để trần, không chip nền: dải này đã có vạch đỏ làm điểm neo bên trái, thêm một
            vòng tròn trắng nữa là hai dấu hiệu tranh nhau cùng một chỗ. */}
        <IconCurrencycircledollar size={32} className="text-action-primary-red-default shrink-0" />

        <span className="flex min-w-0 flex-col">
          <span className="typo-body-base-semibold text-content-dark-1">{LABEL}</span>
          <span className="text-content-dark-3 text-xs">{monthLabel}</span>
        </span>

        <span className="ml-auto flex items-baseline gap-1.5">
          <span className="text-3xl font-medium text-blue-600 tabular-nums">
            {formatCurrencyVND(Number(data?.confirmed_reconciliation_amount) || 0)}
          </span>
          <span className="text-content-dark-3 text-sm font-semibold">VND</span>
        </span>

        <IconCaretright
          size={18}
          className="text-content-dark-3 shrink-0 transition-transform group-hover:translate-x-1"
        />
      </button>
    </LoadingWrapper>
  )
}

export default SalesConfirmedReconciliationCard
