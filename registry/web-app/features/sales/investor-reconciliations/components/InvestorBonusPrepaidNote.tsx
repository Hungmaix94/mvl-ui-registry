import { useState } from 'react'
import { Flex } from '@radix-ui/themes'

import { IconCaretdown } from '@/assets/icons'
import { useDealCommissionConfigList } from '@/features/sales/deals/services/deal-service'
import { extractInvestorBonusPrepaid } from '@/features/sales/_shared/reconciliation/useReconMvReference'
import { formatCurrencyVND } from '@/utils/common'
import { formatDate } from '@/utils/date-utils'
import { cn } from '@/utils'

/** Nhãn loại share thưởng — `pct_type` là mã kỹ thuật của CommissionShare (không có app-constant). */
const PCT_TYPE_LABEL: Record<string, string> = {
  pct_investor_bonus_to_sale: 'Thưởng sale',
  pct_f2_bonus: 'Thưởng F2',
}

interface InvestorBonusPrepaidNoteProps {
  /** Deal đã resolve từ mã căn — null/0 ⇒ không render. */
  dealId: number | null | undefined
}

/**
 * Ô read-only "Đã trích quỹ tạm ứng (chưa đối trừ)" trên form tạo/sửa đối chiếu CĐT — hiện NGAY khi
 * chọn căn (trước khi tạo dòng). Số từ `GET deals/{id}/commission-config/` →
 * `investor_bonus_prepaid.unrecognised_amount`; ẩn khi = 0. `advances[]` expand để trace từng khoản.
 * Query dùng chung key với {@link useReconMvReference} nên KHÔNG phát sinh thêm request.
 *
 * CHỈ LÀ THÔNG TIN: đối chiếu và hoá đơn nay xuất ĐỦ mặt, số này không tự trừ vào công nợ CĐT nữa —
 * kế toán đối trừ nó ở ô "Thu từ quỹ tạm ứng" trên phiếu thu.
 */
function InvestorBonusPrepaidNote({ dealId }: InvestorBonusPrepaidNoteProps) {
  const id = dealId && dealId > 0 ? dealId : 0
  const { data: envelope } = useDealCommissionConfigList(id, { enabled: id > 0 })
  const [expanded, setExpanded] = useState(false)

  const prepaid = extractInvestorBonusPrepaid(envelope)
  const unrecognised = Number(prepaid?.unrecognised_amount || 0)
  if (!id || !prepaid || unrecognised <= 0) return null

  const advances = prepaid.advances ?? []

  return (
    <div className="border-data-blue-default/20 bg-data-blue-default/10 rounded-md border px-4 py-3">
      <Flex align="center" justify="between" gap="3" wrap="wrap">
        <Flex direction="column" gap="1">
          <span className="typo-body-sm-semibold text-data-blue-default">
            Đã tạm ứng thưởng (dự kiến trừ khi duyệt)
          </span>
          <span className="typo-body-xs-regular text-content-dark-3">
            Số cấn thực tế mỗi kỳ ≤ thưởng đã khai vào sổ; phần chưa cấn chuyển kỳ sau.
          </span>
        </Flex>
        <Flex align="center" gap="3">
          <span className="typo-body-base-semibold text-data-blue-default">
            {formatCurrencyVND(unrecognised, { maximumFractionDigits: 0 })} đ
          </span>
          {advances.length > 0 && (
            <button
              type="button"
              onClick={() => setExpanded((prev) => !prev)}
              className="typo-body-sm-medium text-data-blue-default hover:bg-data-blue-default/10 inline-flex cursor-pointer items-center gap-1 rounded-md px-2 py-1"
            >
              {advances.length} khoản
              <span className={cn('transition-transform duration-200', expanded && 'rotate-180')}>
                <IconCaretdown size={14} />
              </span>
            </button>
          )}
        </Flex>
      </Flex>

      {expanded && advances.length > 0 && (
        <div className="border-data-blue-default/20 mt-2 overflow-x-auto border-t pt-2">
          <table className="w-full text-left">
            <thead>
              <tr className="typo-body-xs-regular text-content-dark-3">
                <th className="px-2 py-1 font-medium">Mã tạm ứng</th>
                <th className="px-2 py-1 font-medium">Người nhận</th>
                <th className="px-2 py-1 font-medium">Loại thưởng</th>
                <th className="px-2 py-1 text-right font-medium">Số tiền (gross)</th>
                <th className="px-2 py-1 text-right font-medium">Ngày duyệt</th>
              </tr>
            </thead>
            <tbody>
              {advances.map((adv) => (
                <tr key={adv.id} className="typo-body-sm-regular text-content-dark-1">
                  <td className="px-2 py-1">{adv.code}</td>
                  <td className="px-2 py-1">{adv.recipient_name || '—'}</td>
                  <td className="px-2 py-1">{PCT_TYPE_LABEL[adv.pct_type] ?? adv.pct_type}</td>
                  <td className="px-2 py-1 text-right">
                    {formatCurrencyVND(Number(adv.gross_amount || 0), {
                      maximumFractionDigits: 0,
                    })}{' '}
                    đ
                  </td>
                  <td className="px-2 py-1 text-right">{formatDate(adv.approved_at) ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default InvestorBonusPrepaidNote
