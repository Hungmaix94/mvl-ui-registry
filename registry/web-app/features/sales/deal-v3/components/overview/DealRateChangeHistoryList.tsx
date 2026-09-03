import { formatPercent } from '@/utils/common'
import React from 'react'
import { useDealRateChangeHistory } from '@/features/sales/deals/services/deal-service'
import { Loader2, ArrowRight } from 'lucide-react'
import { formatDate } from '@/utils/date-utils'

const FIELD_TRANSLATIONS: Record<string, string> = {
  pct_revenue: 'Doanh thu tính hoa hồng',
  revenue_amount: 'Doanh thu tính hoa hồng',
  pct_promotion_revenue: 'Doanh thu xúc tiến',
}

const translateCategory = (key: string) => {
  if (FIELD_TRANSLATIONS[key]) return FIELD_TRANSLATIONS[key]
  return key
}

/**
 * Chuẩn hoá một tỷ lệ về SỐ để so sánh. Rỗng/không hợp lệ → null ("không có giá trị").
 *
 * Tỷ lệ trong log là chuỗi decimal của BE (numeric(14,10), đã cắt số 0 thừa khi serialize),
 * nên "5.00" và "5" là CÙNG một giá trị — số chữ số thập phân chỉ là chi tiết lưu trữ, không
 * phải chênh lệch. So sánh chuỗi sẽ dựng ra dòng "Tỷ lệ đổi" trên các log không hề đổi tỷ lệ.
 */
const toPctNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  const num = Number(value)
  return Number.isNaN(num) ? null : num
}

interface DealRateChangeHistoryListProps {
  dealId: number
  fields?: string[]
}

export const DealRateChangeHistoryList: React.FC<DealRateChangeHistoryListProps> = ({
  dealId,
  fields,
}) => {
  const { data, isLoading, error } = useDealRateChangeHistory(dealId)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="text-content-dark-3 h-6 w-6 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-data-red-default py-4 text-center text-sm">
        Có lỗi xảy ra khi tải lịch sử.
      </div>
    )
  }

  let logs =
    (data as any)?.commission_logs ||
    (data as any)?.data?.commission_logs ||
    (Array.isArray(data) ? data : (data as any)?.data) ||
    []

  if (fields && fields.length > 0) {
    logs = logs.filter((log: any) => fields.includes(log.category))
  }

  if (!logs || logs.length === 0) {
    return (
      <div className="text-content-dark-3 py-8 text-center text-sm">Chưa có dữ liệu lịch sử.</div>
    )
  }

  return (
    <div className="divide-border-1 space-y-0 divide-y pt-2">
      {logs.map((log: any) => (
        <div key={log.id} className="py-4">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-content-dark-3 text-xs">
              {formatDate(log.created_at, 'dd/MM/yyyy • HH:mm')}
            </span>
            <span className="text-content-dark-2 text-xs font-medium">
              {log.changed_by?.fullname || log.changed_by?.username || 'Hệ thống'}
            </span>
          </div>

          <div className="text-content-dark-1 mb-3 text-sm font-semibold">
            Thay đổi {translateCategory(log.category)}
          </div>

          <div className="bg-surface-secondary-default flex flex-col gap-2 rounded-lg p-3 text-sm">
            {toPctNumber(log.old_percentage) !== toPctNumber(log.new_percentage) && (
              <div className="flex items-center">
                <span className="text-content-dark-3 w-28 text-xs font-medium tracking-wide uppercase">
                  Tỷ lệ
                </span>
                {/* old_percentage/new_percentage là numeric(14,10) — giữ đủ 10 chữ số thập phân. */}
                <div className="flex items-center gap-3">
                  <span className="text-content-dark-3 line-through">
                    {log.old_percentage !== null
                      ? formatPercent(log.old_percentage, false, 10)
                      : formatPercent(0)}
                  </span>
                  <ArrowRight className="text-content-dark-3 h-3 w-3" />
                  <span className="text-content-dark-1 rounded bg-[#E6F4EA] px-2 py-0.5 font-semibold">
                    {log.new_percentage !== null
                      ? formatPercent(log.new_percentage, false, 10)
                      : formatPercent(0)}
                  </span>
                </div>
              </div>
            )}

            {log.old_amount !== log.new_amount && (
              <div className="flex items-center">
                <span className="text-content-dark-3 w-28 text-xs font-medium tracking-wide uppercase">
                  Số tiền
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-content-dark-3 line-through">
                    {log.old_amount !== null ? Number(log.old_amount).toLocaleString('vi-VN') : '0'}
                  </span>
                  <ArrowRight className="text-content-dark-3 h-3 w-3" />
                  <span className="text-content-dark-1 rounded bg-[#E6F4EA] px-2 py-0.5 font-semibold">
                    {log.new_amount !== null ? Number(log.new_amount).toLocaleString('vi-VN') : '0'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {log.note && (
            <div className="text-content-dark-3 mt-2 text-sm italic">" {log.note} "</div>
          )}
        </div>
      ))}
    </div>
  )
}
