import { useState, type ReactNode } from 'react'
import { generatePath, Link } from 'react-router-dom'
import { Flex } from '@radix-ui/themes'

import { IconCaretdown, IconEye, IconPencilsimple, IconTrashsimple } from '@/assets/icons'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { APP_PATH } from '@/routes'
import { useAbility } from '@/lib/ability'
import { formatPercent } from '@/utils/common'
import { cn } from '@/utils'
import { InvestorReconciliationStatusBadge } from '@/features/sales/_shared/reconciliation/InvestorReconciliationStatusBadge'
import {
  RECON_PERIOD_STRIP_CLS,
  RECON_PERIOD_TYPE_SHORT,
} from '@/features/sales/_shared/reconciliation/recon-period-type'
import { CTVReconciliationPeriod_type } from '@/api/schema'
import {
  reconCheckMismatches,
  type ReconCheck,
} from '@/features/sales/_shared/reconciliation/recon-server-check'
import ReconMismatchList from '@/features/sales/_shared/reconciliation/ReconMismatchList'
import {
  reconVatPair,
  resolveReconVatRate,
} from '@/features/sales/_shared/reconciliation/recon-calculations'
import type { InvestorReconciliationLine } from '@/features/sales/investor-reconciliations/services/investor-reconciliation-line-service'
import { useInvestorReconciliationLineDelete } from '@/features/sales/investor-reconciliations-v2/hooks/useInvestorReconciliationLineDelete'
import InvestorReconciliationUnitLedger from '@/features/sales/investor-reconciliations-v2/components/InvestorReconciliationUnitLedger'
import AddInvestorReconciliationUnitHistoryCards from '@/features/sales/investor-reconciliations-v2/components/AddInvestorReconciliationUnitHistoryCards'
import InvestorReconciliationBonusAdvanceSection from '@/features/sales/investor-reconciliations-v2/components/InvestorReconciliationBonusAdvanceSection'
import {
  amtOrNull,
  numOrNull,
  vnd,
} from '@/features/sales/investor-reconciliations-v2/utils/recon-v2-format'

const NO_VALUE = '-'

/** "Hoa hồng theo HĐPP" / "Phí base" — % nếu có, ngược lại số cố định (amt XOR pct). */
function formatRate(pct: number | null, amt: number | null): string {
  if (amt != null) return vnd(amt)
  if (pct != null) return formatPercent(pct)
  return NO_VALUE
}

/**
 * One label/value pair of the collapsed unit strip.
 *
 * The value WRAPS instead of truncating: these are money amounts, and an ellipsis on
 * "10.000.000.000 VNĐ" hides digits — the reader cannot tell billions from millions. Only the
 * label truncates (with a `title`), so every row keeps the same height.
 */
function UnitCardCell({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Flex direction="column" gap="0" className="min-w-0">
      <span className="typo-body-xs-regular text-content-dark-3 truncate" title={label}>
        {label}
      </span>
      <div className="typo-body-base-medium text-content-dark-2 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 break-words">
        {value}
      </div>
    </Flex>
  )
}

function signedMoney(value: number): string {
  const sign = value > 0 ? '+' : value < 0 ? '−' : ''
  return `${sign}${vnd(Math.abs(value))}`
}

/**
 * Mốc luỹ kế "từ → đến" + Δ của kỳ trong ngoặc — Δ là CHỮ THƯỜNG (mờ hơn), không bọc pill.
 *
 * `emphasis` dành cho tiến độ BASE: nó neo phần chi ra Sale/F2/CTV nên phải đọc nổi hơn tiến độ đối
 * chiếu với CĐT. Thiếu MỘT trong hai mốc ⇒ "-": coi mốc thiếu là 0 là bịa ra một cạnh BE chưa tính.
 */
function ProgressValue({
  from,
  to,
  emphasis,
}: {
  from: number | null
  to: number | null
  emphasis?: boolean
}) {
  if (from == null || to == null) return <>{NO_VALUE}</>
  const delta = to - from
  return (
    <span
      className={cn('whitespace-nowrap', emphasis && 'typo-body-base-semibold text-content-dark-1')}
    >
      {formatPercent(from)} → {formatPercent(to)}{' '}
      {/* Δ mờ hơn cặp mốc: mốc trả lời "đã đối chiếu tới đâu", Δ chỉ là phần phụ chú "đợt này
          thêm bao nhiêu". Màu đặt ở span con nên vẫn thừa hưởng độ đậm của nhánh emphasis. */}
      <span className="text-content-dark-3">
        ({delta > 0 ? `+${formatPercent(delta)}` : formatPercent(delta)})
      </span>
    </span>
  )
}

/**
 * Một mục của dải tổng kết. Khác `UnitCardCell` ở chỗ nhãn KHÔNG cắt (`whitespace-nowrap`): dải này
 * là một hàng flex tự xuống dòng chứ không phải lưới cột cố định, nên mục tự co theo nội dung.
 */
function MoneyCell({
  label,
  value,
  tone,
  strong,
  trailing,
}: {
  label: string
  value: string
  /** Lớp màu của SỐ TIỀN (span luôn tự set màu nên không kế thừa được từ thẻ cha). */
  tone?: string
  strong?: boolean
  trailing?: ReactNode
}) {
  return (
    <Flex direction="column" gap="0" className="shrink-0">
      <span className="typo-body-xs-regular text-content-dark-3 whitespace-nowrap">{label}</span>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
        {/* Ternary chứ KHÔNG cn() hai lớp typo: '.typo-body-base-medium' khai báo sau
            '.typo-body-base-semibold' nên đứng chung một thẻ thì medium đè, mất chữ đậm. */}
        <span
          className={cn(
            strong ? 'typo-body-base-semibold' : 'typo-body-base-medium',
            'whitespace-nowrap',
            tone ?? 'text-content-dark-2'
          )}
        >
          {value}
        </span>
        {trailing}
      </div>
    </Flex>
  )
}

export interface InvestorReconciliationUnitCardProps {
  sheetId: number
  item: InvestorReconciliationLine
  /** isDraft && ability.can('update', 'investor_reconciliation_sheet') — gate Sửa/Xoá. */
  canManage: boolean
  /** Mở dialog "Sửa căn" (AddInvestorReconciliationUnitDialogV2 ở chế độ edit) cho dòng này. */
  onEdit?: (item: InvestorReconciliationLine) => void
}

/**
 * Card thu gọn cho 1 căn trong "Chi tiết căn" (Đối chiếu chủ đầu tư 2.0 — Detail page). Mỗi item của
 * `record.reconciliations` (InvestorReconciliation) đã mang đủ số BE-computed (fee_calculation_price,
 * progress_from/to_pct, pct/amt_agency_fee, base_pct/amt_agency_fee, base_progress_to_pct,
 * total_amount_with_vat, status...) — không cần gọi thêm hook MV/history như dialog "Thêm căn".
 */
function InvestorReconciliationUnitCard({
  sheetId,
  item,
  canManage,
  onEdit,
}: InvestorReconciliationUnitCardProps) {
  const ability = useAbility()
  const [expanded, setExpanded] = useState(false)
  const [historyExpanded, setHistoryExpanded] = useState(false)
  const { openDeleteLineDialog } = useInvestorReconciliationLineDelete(sheetId)

  const mismatches = reconCheckMismatches(item.recon_check as ReconCheck | null)
  const mismatchCount = mismatches.length

  const dealCode = item.deal_detail?.code
  const unitNumber = item.product_inventory_detail?.unit_number
  // Dòng cũ lưu trước khi có period_type ⇒ đọc như kỳ thường (khớp getReconPartVisibility).
  const periodType = item.period_type ?? CTVReconciliationPeriod_type.normal_payment
  const dealDetailPath =
    item.deal > 0 && ability.can('retrieve', 'deal')
      ? generatePath(APP_PATH.DEAL_DETAIL, { id: String(item.deal) })
      : null
  const unitDetailPath =
    item.product_inventory > 0 && ability.can('retrieve', 'project')
      ? generatePath(APP_PATH.PROJECT_PRODUCT_INVENTORIES_DETAIL, {
          id: String(item.product_inventory),
        })
      : null

  const feeCalculationPrice = numOrNull(item.fee_calculation_price)
  const progressFrom = numOrNull(item.progress_from_pct)
  const progressTo = numOrNull(item.progress_to_pct)
  const agencyFeeText = formatRate(numOrNull(item.pct_agency_fee), amtOrNull(item.amt_agency_fee))
  const baseFeeText = formatRate(
    numOrNull(item.base_pct_agency_fee),
    amtOrNull(item.base_amt_agency_fee)
  )
  const baseProgressFrom = numOrNull(item.base_progress_from_pct)
  const baseProgressTo = numOrNull(item.base_progress_to_pct)
  const hasVat = !!(
    item.is_agency_fee_include_vat ||
    item.is_shared_bonus_include_vat ||
    item.is_extra_bonus_include_vat ||
    item.is_fee_deduction_include_vat
  )

  // Mỗi cấu phần được lưu theo cờ VAT RIÊNG của nó, nên đặt số thô cạnh nhau là xếp các số khác
  // trục lên cùng một dòng — cộng mắt ra "Tổng chưa VAT" sẽ sai. Quy tất cả về CHƯA VAT bằng đúng
  // phép của bảng ledger (reconVatPair) để cả dải nằm trên một trục. Hai dòng tổng vẫn lấy THẲNG số
  // BE (BE bóc VAT từng cấu phần rồi làm tròn MỘT lần — xem investor_reconciliation.py `_recompute`),
  // nên Σ cấu phần hiển thị có thể lệch ±1đ với "Tổng chưa VAT"; FE không tự cộng để bù.
  const vatRate = resolveReconVatRate(item.vat_rate)
  const netOf = (value: number | null, includeVat: boolean): number | null =>
    value == null ? null : reconVatPair(value, includeVat, vatRate).noVat

  const periodCommission = netOf(
    numOrNull(item.period_commission),
    !!item.is_agency_fee_include_vat
  )
  const retroactive = netOf(
    numOrNull(item.retroactive_adjustment_amount),
    !!item.is_agency_fee_include_vat
  )
  const extraBonusPeriod = netOf(
    numOrNull(item.extra_bonus_period_amount),
    !!item.is_extra_bonus_include_vat
  )
  const sharedBonusPeriod = netOf(
    numOrNull(item.shared_bonus_period_amount),
    !!item.is_shared_bonus_include_vat
  )
  const feeDeduction = netOf(numOrNull(item.fee_deduction), !!item.is_fee_deduction_include_vat)
  const totalNoVat = numOrNull(item.total_amount)
  const totalWithVat = numOrNull(item.total_amount_with_vat)

  return (
    <Collapsible
      open={expanded}
      onOpenChange={setExpanded}
      className="border-border-1 rounded-md border p-4"
    >
      <Flex align="center" justify="between" gap="3">
        <Flex align="center" gap="2" className="min-w-0">
          {unitNumber && unitDetailPath ? (
            <Link
              to={unitDetailPath}
              target="_blank"
              rel="noopener noreferrer"
              title={`Xem chi tiết căn ${unitNumber}`}
              className="typo-body-base-semibold text-action-primary-red-default hover:text-action-primary-red-hover truncate"
            >
              {unitNumber}
            </Link>
          ) : (
            <span className="typo-body-base-semibold text-content-dark-1 truncate">
              {unitNumber || NO_VALUE}
            </span>
          )}
          {dealCode && (
            <span className="typo-body-sm-regular text-content-dark-3 shrink-0 whitespace-nowrap">
              {dealCode}
            </span>
          )}
          {dealDetailPath && (
            <Link
              to={dealDetailPath}
              target="_blank"
              rel="noopener noreferrer"
              title={`Xem chi tiết giao dịch ${dealCode}`}
              className="text-content-dark-3 hover:text-action-primary-red-default shrink-0"
            >
              <IconEye size={16} />
            </Link>
          )}
          {/* Loại kỳ — dòng nào cũng phải đọc được ngay ở header, nhất là kỳ hủy cọc: nó đóng giao
              dịch nên không được lẫn với một kỳ thường. Dùng chung nhãn/màu với lịch sử đối chiếu. */}
          <span
            className={cn(
              'typo-body-xs-medium inline-flex w-fit shrink-0 items-center rounded-full px-2 py-0.5',
              RECON_PERIOD_STRIP_CLS[periodType]
            )}
          >
            {RECON_PERIOD_TYPE_SHORT[periodType]}
          </span>
          {item.status && <InvestorReconciliationStatusBadge status={item.status} />}
          {mismatchCount > 0 && (
            <span className="bg-data-yellow-disabled text-data-yellow-default typo-body-xs-medium inline-flex w-fit shrink-0 items-center gap-1 rounded-full px-2 py-0.5">
              <span className="bg-data-yellow-default size-[6px] shrink-0 rounded-full" />
              {mismatchCount} Cảnh báo
            </span>
          )}
        </Flex>

        <Flex align="center" gap="3" className="shrink-0">
          {canManage && (
            <button
              type="button"
              onClick={() => onEdit?.(item)}
              title="Sửa căn"
              aria-label="Sửa căn"
              className="text-content-dark-3 hover:text-content-dark-1 inline-flex cursor-pointer items-center justify-center"
            >
              <IconPencilsimple size={16} />
            </button>
          )}
          {canManage && (
            <button
              type="button"
              onClick={() => openDeleteLineDialog(item)}
              title="Xoá căn"
              aria-label="Xoá căn"
              className="text-action-primary-red-default hover:text-action-primary-red-hover inline-flex cursor-pointer items-center justify-center"
            >
              <IconTrashsimple size={16} />
            </button>
          )}
          <CollapsibleTrigger asChild>
            <button
              type="button"
              title={expanded ? 'Thu gọn' : 'Mở rộng'}
              aria-label={expanded ? 'Thu gọn' : 'Mở rộng'}
              className="text-content-dark-3 hover:text-content-dark-1 inline-flex cursor-pointer items-center justify-center"
            >
              <span
                className={cn(
                  'inline-flex transition-transform duration-300 ease-out',
                  expanded && 'rotate-180'
                )}
              >
                <IconCaretdown size={16} />
              </span>
            </button>
          </CollapsibleTrigger>
        </Flex>
      </Flex>

      {/*
        Dải 1 — cơ sở tính. Mỗi tỷ lệ đứng ngay cạnh dải tiến độ ăn theo nó: phí base ↔ tiến độ base
        (trục neo phần chi ra Sale/F2/CTV), HH theo HĐPP ↔ tiến độ kỳ này (trục nhân ra tiền đối
        chiếu với CĐT). Cặp base đứng trước và được tô nổi hơn theo yêu cầu đọc nhanh.

        auto-fit rather than a fixed column count: at a 924px card, fixed tracks land around 134px
        while "Giá tính phí" needs 142px and a progress cell ("0% → 25%" + chip) needs more — both
        got clipped. Let the track count follow the real width instead.
      */}
      <div className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-x-4 gap-y-3">
        <UnitCardCell
          label="Giá tính phí"
          value={feeCalculationPrice != null ? vnd(feeCalculationPrice) : NO_VALUE}
        />
        <UnitCardCell label="Phí base" value={baseFeeText} />
        <UnitCardCell
          label="Tiến độ ĐC base"
          value={<ProgressValue from={baseProgressFrom} to={baseProgressTo} emphasis />}
        />
        <UnitCardCell label="Phí đại lý" value={agencyFeeText} />
        <UnitCardCell
          label="Tiến độ ĐC kỳ này"
          value={<ProgressValue from={progressFrom} to={progressTo} />}
        />
      </div>

      {/* Dải 2 — tổng kết. Gom SÁT NHAU những số tạo nên tổng của căn rồi mới tới hai dòng tổng, để
          đọc được cả phép cộng chứ không chỉ con số cuối. Mục = 0 / không có thì ẩn (giống dải KPI
          bản 1.0) — căn đơn giản không phải mang theo bốn ô rỗng. */}
      <div className="bg-background-2 border-border-1 mt-3 flex flex-wrap items-end gap-x-5 gap-y-3 rounded-md border px-3 py-2.5">
        <span
          className="typo-body-xs-semibold text-content-dark-3 shrink-0 self-center uppercase"
          title="Các cấu phần quy về chưa VAT theo cờ VAT của từng mục; hai dòng tổng lấy thẳng số hệ thống."
        >
          Kỳ này
        </span>
        <MoneyCell
          label="Phí đại lý kỳ này"
          value={periodCommission != null ? vnd(periodCommission) : NO_VALUE}
        />
        {retroactive != null && retroactive !== 0 && (
          <MoneyCell
            label="Truy hồi"
            value={signedMoney(retroactive)}
            tone={retroactive < 0 ? 'text-data-red-default' : 'text-data-green-default'}
          />
        )}
        {extraBonusPeriod != null && extraBonusPeriod !== 0 && (
          <MoneyCell label="Phí tăng thêm" value={signedMoney(extraBonusPeriod)} />
        )}
        {sharedBonusPeriod != null && sharedBonusPeriod !== 0 && (
          <MoneyCell label="Thưởng kỳ này" value={vnd(sharedBonusPeriod)} />
        )}
        {feeDeduction != null && feeDeduction !== 0 && (
          <MoneyCell
            label="Khấu trừ"
            value={signedMoney(-feeDeduction)}
            tone="text-data-red-default"
          />
        )}
        {/* Hai dòng tổng dạt hẳn sang lề PHẢI (`ml-auto`) để mọi căn có tổng thẳng cột nhau khi quét
            dọc danh sách, thay vì trôi theo số cấu phần mà căn đó có. Vẫn nằm trong MỘT nhóm không
            tự tách: để rời trong hàng flex thì ở bề rộng ~1100px "Tổng chưa VAT" ở lại hàng trên
            còn "Tổng có VAT" rơi xuống hàng dưới — đúng cặp số cần đọc cạnh nhau lại bị tách xa. */}
        <div className="ml-auto flex shrink-0 items-end gap-x-5">
          <div className="bg-border-1 h-8 w-px shrink-0" aria-hidden />
          <MoneyCell
            label="Tổng chưa VAT"
            value={totalNoVat != null ? vnd(totalNoVat) : NO_VALUE}
            strong
            tone="text-content-dark-1"
          />
          {/* Badge là anh em của số tiền, không lồng bên trong: ô vốn đã là hàng flex tự xuống dòng
              nên khi hẹp badge rơi xuống dưới thay vì bị cắt. */}
          <MoneyCell
            label="Tổng có VAT"
            value={totalWithVat != null ? vnd(totalWithVat) : NO_VALUE}
            strong
            tone="text-action-primary-red-default"
            trailing={
              hasVat && (
                <span className="typo-body-xs-semibold bg-data-red-disabled text-data-red-default shrink-0 rounded-full px-2 py-0.5">
                  VAT
                </span>
              )
            }
          />
        </div>
      </div>

      {/* `pt-3` rather than `mt-3` on the inner wrapper: a top margin would sit outside the height
          Radix animates and make the panel jump at the start of the transition. */}
      <CollapsibleContent className="collapsible-animated">
        <div className="flex flex-col gap-3 pt-3">
          {/* Đặt TRÊN mọi thứ khác trong phần mở rộng: badge header nói "N Cảnh báo" thì mở rộng ra
              phải đọc được đủ N ngay. Bảng ledger bên dưới chỉ gắn chip cho các dòng nó có, không
              phủ được 3 cờ VAT — xem ReconMismatchList. */}
          <ReconMismatchList mismatches={mismatches} />

          <Collapsible
            open={historyExpanded}
            onOpenChange={setHistoryExpanded}
            className="border-border-1 overflow-hidden rounded-md border"
          >
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="bg-background-2 flex w-full cursor-pointer items-center justify-between px-3 py-2.5"
              >
                <span className="typo-body-base-semibold text-content-dark-1">
                  Lịch sử đối chiếu
                </span>
                <span
                  className={cn(
                    'text-content-dark-3 inline-flex transition-transform duration-300 ease-out',
                    historyExpanded && 'rotate-180'
                  )}
                >
                  <IconCaretdown size={16} />
                </span>
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="collapsible-animated">
              <AddInvestorReconciliationUnitHistoryCards
                dealId={item.deal}
                excludeInvestorSheetId={sheetId}
              />
            </CollapsibleContent>
          </Collapsible>

          <InvestorReconciliationBonusAdvanceSection dealId={item.deal} />

          <InvestorReconciliationUnitLedger item={item} />
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

export default InvestorReconciliationUnitCard
