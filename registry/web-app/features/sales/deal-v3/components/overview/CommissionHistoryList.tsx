import { formatPercent } from '@/utils/common'
import React from 'react'
import {
  useDealCommissionHistory,
  useDealCommissionShares,
} from '@/features/sales/deals/services/deal-service'
import { CommissionSectionType } from '@/features/sales/deals/services/deal-service'
import { Loader2, ArrowRight } from 'lucide-react'
import { formatDate } from '@/utils/date-utils'
import { getParticipantName } from '../../utils/commission-recipient'
import { isHiddenCommissionField } from '@/constants/commission'

const FIELD_TRANSLATIONS: Record<string, string> = {
  // Promotion
  pct_relationship: 'Phí quan hệ',
  pct_planning: 'Kế hoạch',
  pct_packaging: 'Đóng gói',
  pct_sales_support: 'Hỗ trợ bán hàng',
  pct_coordination: 'Điều phối',

  // Split
  pct_sale_commission: 'HH Sale/Đại lý',
  pct_mv_bonus_to_sale: 'Thưởng nóng MV cho Sale',
  pct_investor_bonus_to_sale: 'Hoa hồng cơ bản của sàn',
  pct_f2_commission: 'HH cho Sàn liên kết',
  pct_f2_bonus: 'Thưởng nóng CĐT cho Sàn liên kết',
  pct_mv_bonus_to_f2: 'Thưởng nóng MV cho Sàn liên kết',
}

const ROLE_TRANSLATIONS: Record<string, string> = {
  ceo: 'TGĐ',
  deputy_ceo: 'P.TGĐ',
  project_director: 'GĐ Dự án',
  sales_director: 'GĐ Bán hàng',
  sales_manager: 'TP KD',
  head_sales_secretary: 'T.P TK Bán hàng',
  project_secretary: 'TK Dự án',
  branch_director: 'GĐ Chi nhánh',
}
const CATEGORY_TRANSLATIONS: Record<string, string> = {
  agency_fee: 'Thưởng quản lý',
  project_bonus: 'Thưởng dự án',
  mv_bonus: 'Thưởng quản lý bổ sung',
  investor_bonus: 'Thưởng quản lý từ CDT',
}
const translateCategory = (key: string) => {
  if (FIELD_TRANSLATIONS[key]) return FIELD_TRANSLATIONS[key]

  if (key.startsWith('mgmt_')) {
    const match = key.match(/^mgmt_(.*)_(agency_fee|project_bonus|mv_bonus|investor_bonus)$/)
    if (match) {
      const role = ROLE_TRANSLATIONS[match[1]] || match[1]
      const cat = CATEGORY_TRANSLATIONS[match[2]] || match[2]
      return `${cat} (${role})`
    }
  }
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

interface CommissionHistoryListProps {
  dealId: number
  section: CommissionSectionType
}

export const CommissionHistoryList: React.FC<CommissionHistoryListProps> = ({
  dealId,
  section,
}) => {
  const { data, isLoading, error } = useDealCommissionHistory(dealId, section)
  const { data: sharesData } = useDealCommissionShares(dealId, section)

  const shareRecipientMap = React.useMemo(() => {
    const map = new Map<number, string>()
    const shares =
      (sharesData as any)?.commission_shares || (sharesData as any)?.data?.commission_shares || []
    shares.forEach((share: any) => {
      if (share.id != null) {
        map.set(Number(share.id), getParticipantName(share))
      }
    })
    return map
  }, [sharesData])

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

  // Assuming data contains `commission_logs` based on OpenAPI description
  const logs = (data as any)?.commission_logs || (data as any)?.data?.commission_logs || []
  // "Thưởng cho sàn LK từ MV" (mv_bonus_to_f2) ẩn khỏi toàn bộ UI (ClickUp 86eycwqq1).
  const visibleLogs = (Array.isArray(logs) ? logs : []).filter(
    (log: any) => !isHiddenCommissionField(log?.category)
  )

  if (visibleLogs.length === 0) {
    return (
      <div className="text-content-dark-3 py-8 text-center text-sm">Chưa có dữ liệu lịch sử.</div>
    )
  }

  return (
    <div className="divide-border-1 space-y-0 divide-y pt-2">
      {visibleLogs.map((log: any) => (
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
            {log.share && shareRecipientMap.get(Number(log.share)) && (
              <span className="text-content-dark-3 font-normal">
                {' — '}
                {shareRecipientMap.get(Number(log.share))}
              </span>
            )}
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

            {(() => {
              let oldAmt = log.old_amount != null ? parseFloat(log.old_amount) : null
              let newAmt = log.new_amount != null ? parseFloat(log.new_amount) : null

              if ((oldAmt === null || oldAmt === 0) && (newAmt === null || newAmt === 0)) {
                if (log.old_calculated_amount != null || log.new_calculated_amount != null) {
                  oldAmt =
                    log.old_calculated_amount != null ? parseFloat(log.old_calculated_amount) : 0
                  newAmt =
                    log.new_calculated_amount != null ? parseFloat(log.new_calculated_amount) : 0
                }
              }

              if (
                oldAmt === newAmt ||
                (oldAmt === null && newAmt === 0) ||
                (oldAmt === 0 && newAmt === null)
              ) {
                return null
              }

              return (
                <div className="flex items-center">
                  <span className="text-content-dark-3 w-28 text-xs font-medium tracking-wide uppercase">
                    Số tiền
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-content-dark-3 line-through">
                      {oldAmt !== null ? Number(oldAmt).toLocaleString('vi-VN') : '0'}
                    </span>
                    <ArrowRight className="text-content-dark-3 h-3 w-3" />
                    <span className="text-content-dark-1 rounded bg-[#E6F4EA] px-2 py-0.5 font-semibold">
                      {newAmt !== null ? Number(newAmt).toLocaleString('vi-VN') : '0'}
                    </span>
                  </div>
                </div>
              )
            })()}
          </div>

          {log.note && (
            <div className="text-content-dark-3 mt-2 text-sm italic">" {log.note} "</div>
          )}
        </div>
      ))}
    </div>
  )
}
