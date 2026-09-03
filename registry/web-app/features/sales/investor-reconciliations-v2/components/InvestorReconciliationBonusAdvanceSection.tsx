import { useState, type ReactNode } from 'react'
import { generatePath, Link, useInRouterContext } from 'react-router-dom'
import { Flex } from '@radix-ui/themes'

import { IconCaretdown, IconEye } from '@/assets/icons'
import { APP_PATH } from '@/routes'
import { useAbility } from '@/lib/ability'
import { useDealCommissionConfigList } from '@/features/sales/deals/services/deal-service'
import {
  extractInvestorBonusPrepaid,
  type DealInvestorBonusPrepaid,
} from '@/features/sales/_shared/reconciliation/useReconMvReference'
import { formatCurrencyVND } from '@/utils/common'
import { formatDate } from '@/utils/date-utils'
import { cn } from '@/utils'

type BonusAdvance = DealInvestorBonusPrepaid['advances'][number]

const NO_VALUE = '—'

/** Nhãn loại share thưởng — `pct_type` là mã kỹ thuật của CommissionShare (không có app-constant), map như v1. */
const PCT_TYPE_LABEL: Record<string, string> = {
  pct_investor_bonus_to_sale: 'Thưởng sale',
  pct_f2_bonus: 'Thưởng F2',
}

function vnd(value: number): string {
  return `${formatCurrencyVND(value, { maximumFractionDigits: 0 })} VNĐ`
}

function AdvanceCell({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Flex direction="column" gap="0" className="min-w-0">
      <span className="typo-body-xs-regular text-content-dark-3 whitespace-nowrap">{label}</span>
      <span className="typo-body-base-medium text-content-dark-2 truncate">{value}</span>
    </Flex>
  )
}

/** Link con mắt tới chi tiết tạm ứng — router-aware: dialog render NGOÀI RouterProvider nên phải dùng <a>. */
function AdvanceEyeLink({ id, code }: { id: number; code: string }) {
  const ability = useAbility()
  const inRouterContext = useInRouterContext()
  if (id <= 0 || !ability.can('retrieve', 'commissionadvance')) return null
  const path = generatePath(APP_PATH.COMMISSION_ADVANCE_DETAIL, { id: String(id) })
  const shared = {
    target: '_blank',
    rel: 'noopener noreferrer',
    title: `Xem chi tiết tạm ứng ${code}`,
    className: 'text-content-dark-3 hover:text-action-primary-red-default shrink-0',
  } as const
  return inRouterContext ? (
    <Link to={path} {...shared}>
      <IconEye size={16} />
    </Link>
  ) : (
    <a href={path} {...shared}>
      <IconEye size={16} />
    </a>
  )
}

function AdvanceCard({ advance }: { advance: BonusAdvance }) {
  const typeLabel = PCT_TYPE_LABEL[advance.pct_type] ?? advance.pct_type
  return (
    <Flex direction="column" gap="3" className="bg-background-2 px-4 py-3">
      <Flex align="center" gap="2" className="min-w-0">
        <span className="typo-body-base-semibold text-content-dark-1 truncate">{advance.code}</span>
        <span className="typo-body-xs-medium bg-data-green-disabled text-data-green-default shrink-0 rounded-full px-2 py-0.5">
          Đã duyệt
        </span>
        <AdvanceEyeLink id={advance.id} code={advance.code} />
      </Flex>
      <div className="grid grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-4">
        <Flex direction="column" gap="0" className="min-w-0">
          <span className="typo-body-sm-semibold text-content-dark-1 truncate">
            {advance.recipient_name || '—'}
          </span>
        </Flex>
        <AdvanceCell label="Loại thưởng" value={typeLabel} />
        <AdvanceCell
          label="Số tiền"
          value={
            <span className="typo-body-base-semibold text-action-primary-red-default">
              {vnd(Number(advance.gross_amount || 0))}
            </span>
          }
        />
        <AdvanceCell label="Ngày duyệt" value={formatDate(advance.approved_at) ?? NO_VALUE} />
      </div>
    </Flex>
  )
}

export interface InvestorReconciliationBonusAdvanceSectionProps {
  /** Deal đã resolve từ mã căn — null/0 ⇒ không render. */
  dealId: number | null | undefined
}

/**
 * Section thu/mở "Đã tạm ứng thưởng (dự kiến trừ khi duyệt)" cho Đối chiếu chủ đầu tư 2.0 — đặt DƯỚI
 * "Lịch sử đối chiếu" (cả unit card màn Chi tiết lẫn dialog Thêm/Sửa căn).
 *
 * Data + điều kiện hiển thị TÁI DÙNG NGUYÊN v1 (`InvestorBonusPrepaidNote`): số từ
 * `GET deals/{id}/commission-config/` → `investor_bonus_prepaid.advances[]` (`extractInvestorBonusPrepaid`);
 * query dùng chung key với `useReconMvReference` nên KHÔNG phát sinh thêm request trong dialog. Ẩn khi
 * `unrecognised_amount <= 0` hoặc không có advance.
 *
 * KHÁC v1 (chủ ý): v1 gắn note chỉ khi `!isReadOnly` ⇒ BUG chỉ hiện ở màn Sửa, KHÔNG hiện ở Chi tiết.
 * v2 là component độc lập, mount ở CẢ Chi tiết lẫn dialog → fix bug đó. Ảnh mẫu có phòng ban/chi nhánh
 * của NV và badge VAT nhưng `DealInvestorBonusPrepaidAdvance` (BE) KHÔNG trả field đó ⇒ BE gap, tạm bỏ.
 */
function InvestorReconciliationBonusAdvanceSection({
  dealId,
}: InvestorReconciliationBonusAdvanceSectionProps) {
  const id = dealId && dealId > 0 ? dealId : 0
  const { data: envelope } = useDealCommissionConfigList(id, { enabled: id > 0 })
  const [open, setOpen] = useState(false)

  const prepaid = extractInvestorBonusPrepaid(envelope)
  const unrecognised = Number(prepaid?.unrecognised_amount || 0)
  const advances = prepaid?.advances ?? []
  if (!id || unrecognised <= 0 || advances.length === 0) return null

  return (
    <div className="border-border-1 overflow-hidden rounded-md border">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="bg-background-2 flex w-full cursor-pointer items-center justify-between gap-2 px-3 py-2.5"
      >
        <span className="typo-body-base-semibold text-content-dark-1 text-left">
          Đã trích quỹ tạm ứng (chưa đối trừ vào phiếu thu)
        </span>
        <span
          className={cn(
            'text-content-dark-3 inline-flex shrink-0 transition-transform duration-300 ease-out',
            open && 'rotate-180'
          )}
        >
          <IconCaretdown size={16} />
        </span>
      </button>

      {open && (
        <Flex direction="column">
          {advances.map((advance, idx) => (
            <div key={advance.id} className={idx > 0 ? 'border-border-1 border-t' : undefined}>
              <AdvanceCard advance={advance} />
            </div>
          ))}
        </Flex>
      )}
    </div>
  )
}

export default InvestorReconciliationBonusAdvanceSection
