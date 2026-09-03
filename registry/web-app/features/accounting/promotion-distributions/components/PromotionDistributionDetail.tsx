import type { ReactNode } from 'react'
import { Flex } from '@radix-ui/themes'
import { Chip } from '@/components/ui'
import { DisplayFieldRow } from '@/components/commons/DisplayField'
import ProjectDetailLink from '@/components/commons/ProjectDetailLink'
import DealDetailLink from '@/components/commons/DealDetailLink'
import { IconCalendar } from '@/assets/icons'
import { formatDate } from '@/utils/date-utils'
import { cn, formatCurrencyVND, formatPercent, formatNumber } from '@/utils'
import type { ProjectPromotionDistribution } from '@/features/accounting/promotion-distributions/services/promotion-distribution-service'
import { usePromotionDistributionDeals } from '@/features/accounting/promotion-distributions/services/promotion-distribution-service'
import {
  computeDeptCommission,
  computeRevenue,
} from '@/features/accounting/promotion-distributions/utils/promotion-distribution-calc'
import PromotionDistributionBreakdownTable from '@/features/accounting/promotion-distributions/components/PromotionDistributionBreakdownTable'
import {
  PROMOTION_DISTRIBUTION_STATUS_LABEL,
  PROMOTION_DISTRIBUTION_STATUS_VARIANT,
} from '@/features/accounting/promotion-distributions/constants/promotion-distribution-constants'

type PromotionDistributionDetailProps = {
  item: ProjectPromotionDistribution
  /** Buttons rendered inline next to the status chip in the summary card header. */
  headerActions?: ReactNode
}

function formatPeriodLabel(month?: number | null, year?: number | null): string {
  if (!month || !year) return 'Kỳ —'
  return `Kỳ ${String(month).padStart(2, '0')}/${year}`
}

function formatPeriodPill(month?: number | null, year?: number | null): string | null {
  if (!month || !year) return null
  return `${String(month).padStart(2, '0')}/${year}`
}

type SummaryRowProps = {
  label: ReactNode
  value: ReactNode
  className?: string
  /** Sequence marker rendered as a muted `(n)` prefix before the label. */
  index?: number
  /** Formula hint rendered in muted italic below the label (e.g. `= (1) × (2) ÷ 100`). */
  formula?: ReactNode
}

function SummaryRow({ label, value, className, index, formula }: SummaryRowProps) {
  return (
    <div className={cn('flex items-center justify-between gap-4 py-3.5', className)}>
      <span className="text-content-dark-2 flex flex-col text-sm">
        <span>
          {index != null ? <span className="text-content-dark-4 mr-1">({index})</span> : null}
          {label}
        </span>
        {formula ? (
          <span className="text-content-dark-4 text-[11px] font-normal italic">{formula}</span>
        ) : null}
      </span>
      <span className="text-right text-sm">{value}</span>
    </div>
  )
}

type MoneyValueProps = {
  amount: number
  /** Color applied to the numeric part. The unit "VNĐ" stays muted. */
  tone?: 'default' | 'red' | 'blue'
  /** Prepended to the formatted number (e.g. `−` for an outgoing cost). */
  prefix?: string
  /** Override the unit suffix (defaults to `VNĐ`). */
  unit?: string
  /** Bump the number to semibold (default true). */
  emphasis?: boolean
}

function MoneyValue({
  amount,
  tone = 'default',
  prefix,
  unit = 'VNĐ',
  emphasis = true,
}: MoneyValueProps) {
  const toneClass =
    tone === 'red'
      ? 'text-data-red-default'
      : tone === 'blue'
        ? 'text-data-blue-default'
        : 'text-content-dark-1'
  return (
    <>
      <span className={cn('', emphasis ? 'font-semibold' : 'font-normal', toneClass)}>
        {prefix}
        {formatCurrencyVND(amount)}
      </span>
      <span className="text-content-dark-3 ml-1 text-xs font-normal">{unit}</span>
    </>
  )
}

export default function PromotionDistributionDetail({
  item,
  headerActions,
}: PromotionDistributionDetailProps) {
  const revenue = computeRevenue(item)
  const deptCommission = computeDeptCommission(item)
  const payoutPct = Number(item.payout_ratio ?? 0) * 100
  const pctPromotionRevenue = Number(item.snapshot_pct_promotion_revenue ?? 0)
  const statusLabel = PROMOTION_DISTRIBUTION_STATUS_LABEL[item.status] ?? String(item.status)
  const statusVariant = PROMOTION_DISTRIBUTION_STATUS_VARIANT[item.status]

  const periodLabel = formatPeriodLabel(item.period_month, item.period_year)
  const periodPill = formatPeriodPill(item.period_month, item.period_year)

  // Deals proving the "Tiền hàng" (Σ fee_calculation_price) and "Số lượng giao dịch" numbers.
  // Only fetch when the record actually has deals; the headline totals stay the source of
  // truth for the table's summary line so the proof can never contradict them.
  const hasDeals = (item.total_deals ?? 0) > 0
  const { data: deals } = usePromotionDistributionDeals(item.id, { enabled: hasDeals })
  const dealRows = deals?.results ?? []
  const dealCount = item.total_deals ?? 0
  const dealFeeTotal = Number(item.total_fee_calculation_price ?? 0)
  const dealInvoiceTotal = Number(item.total_invoice_amount ?? 0)
  // Totals are summed from the LIVE (pre-VAT) rows — the service fetches EVERY page,
  // so these cover all eligible deals. Live (not the stored total_receipt_in_period)
  // because records saved before the VAT-normalisation fix stored the gross face
  // (e.g. 71.5M = 65M x 1.1) and would contradict the per-row net values.
  const dealReceivedTotal = dealRows.reduce((s, d) => s + Number(d.received_in_period || 0), 0)
  const dealReceivedGrossTotal = dealRows.reduce(
    (s, d) => s + Number(d.received_in_period_gross || 0),
    0
  )
  const dealPayoutPct =
    dealInvoiceTotal > 0 ? Math.min(dealReceivedTotal / dealInvoiceTotal, 1) * 100 : 0
  // (6) "Tỷ lệ tiền về kỳ này" in the summary card and the deals-table footer share ONE
  // source: the live per-deal proof when loaded, else the stored payout_ratio. This keeps
  // the headline and the proof from showing two different percentages.
  const payoutDisplayPct = dealRows.length > 0 ? dealPayoutPct : payoutPct

  return (
    <div className="flex flex-col gap-5">
      {/* Period banner */}
      <div className="bg-action-primary-red-default text-content-light-1 flex items-center justify-between rounded-lg px-6 py-5">
        <div className="flex items-center gap-4">
          <div className="bg-content-light-1/15 flex h-11 w-11 items-center justify-center rounded-md">
            <IconCalendar size={22} color="#ffffff" />
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-semibold tracking-[0.08em] uppercase opacity-85">
              Kỳ tính hoa hồng
            </span>
            <span className="text-2xl font-semibold">{periodLabel}</span>
          </div>
        </div>
        {periodPill ? (
          <div className="bg-content-light-1 text-content-dark-1 rounded-full px-4 py-1.5 text-sm font-semibold">
            {periodPill}
          </div>
        ) : null}
      </div>

      {/* Summary card */}
      <div className="border-border-1 flex flex-col rounded-lg border bg-white">
        <Flex
          direction={{ initial: 'column', md: 'row' }}
          align={{ initial: 'start', md: 'center' }}
          justify="between"
          gap="3"
          className="border-border-1 border-b px-6 py-4"
        >
          <h3 className="text-content-dark-1 text-lg font-semibold">
            Hoa hồng Đầu tư, Xúc tiến &amp; Phát triển Dự án
            {item.project_name ? (
              <>
                {' - '}
                <ProjectDetailLink projectId={item.project} className="font-semibold">
                  {item.project_name}
                </ProjectDetailLink>
              </>
            ) : null}
          </h3>
          <Flex align="center" gap="3">
            {statusVariant ? <Chip variant={statusVariant} label={statusLabel} /> : null}
            {headerActions}
          </Flex>
        </Flex>

        <div className="grid grid-cols-1 gap-6 px-6 py-5 md:grid-cols-3">
          <div className="flex flex-col md:col-span-2">
            <SummaryRow
              index={1}
              label="Tiền hàng"
              value={<MoneyValue amount={Number(item.total_fee_calculation_price ?? 0)} />}
            />
            <SummaryRow
              label="Số lượng giao dịch trong kỳ"
              value={
                <>
                  <span className="text-content-dark-1 font-semibold">{item.total_deals ?? 0}</span>
                  <span className="text-content-dark-3 ml-1 text-xs">GD</span>
                </>
              }
            />
            <SummaryRow
              index={2}
              label="Tỷ lệ doanh thu xúc tiến"
              value={
                <span className="text-content-dark-1 font-semibold">
                  {formatPercent(pctPromotionRevenue)}
                </span>
              }
            />
            <SummaryRow
              index={3}
              label="Doanh thu"
              formula="= (1) × (2) ÷ 100"
              value={<MoneyValue amount={revenue} />}
            />
            <SummaryRow
              index={4}
              className="border-border-1 border-b"
              label={
                <>
                  Chi phí bán hàng
                  {item.mkt_cutoff_date ? (
                    <span className="text-content-dark-3 ml-1 text-xs font-normal">
                      (đến {formatDate(item.mkt_cutoff_date)})
                    </span>
                  ) : null}
                </>
              }
              value={<MoneyValue amount={Number(item.marketing_cost ?? 0)} tone="red" prefix="−" />}
            />
            <SummaryRow
              index={5}
              label={<span className="text-content-dark-1 font-semibold">DT tính hoa hồng</span>}
              formula="= (3) − (4)"
              value={<MoneyValue amount={Number(item.revenue_base ?? 0)} tone="blue" />}
            />
            <SummaryRow
              index={6}
              label="Tỷ lệ tiền về kỳ này"
              formula="= Phí thu được trong kỳ ÷ Tổng phí phải thu theo hóa đơn (chưa gồm VAT) của các GD trong rổ · tối đa 100% (thu vượt vẫn tính 100%)"
              value={
                <span className="text-data-green-default font-semibold">
                  {formatNumber(payoutDisplayPct, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                  %
                </span>
              }
            />
          </div>

          <div
            className={cn(
              'flex flex-col gap-4 self-start p-5',
              'bg-[linear-gradient(180deg,var(--color-action-primary-red-activated)_0%,var(--color-content-light-1)_100%)]',
              'border-action-primary-red-default/40 rounded-lg border',
              'h-full'
            )}
          >
            <span className="text-action-primary-red-default text-xs font-semibold tracking-[0.08em] uppercase">
              Hoa hồng Phòng
            </span>
            <div className="flex flex-1 flex-col justify-center">
              <span className="text-action-primary-red-default text-3xl leading-tight font-semibold">
                {formatCurrencyVND(deptCommission)}
              </span>
              <span className="text-action-primary-red-default text-base font-normal">VNĐ</span>
            </div>
          </div>
        </div>
      </div>

      {/* Breakdown table */}
      <div className="flex flex-col gap-3">
        <PromotionDistributionBreakdownTable
          lines={item.lines ?? []}
          departmentAllocations={item.department_allocations ?? []}
          totalLabel="Tổng HH Đầu tư, Xúc tiến & PT Dự án"
        />
      </div>

      {/* Eligible deals — proof for "Tiền hàng" + "Số lượng giao dịch trong kỳ" */}
      <div className="border-border-1 flex flex-col rounded-lg border bg-white">
        <div className="border-border-1 flex items-start justify-between gap-4 border-b px-6 py-4">
          <div className="flex flex-col gap-0.5">
            <h3 className="text-content-dark-1 text-lg font-semibold">
              Giao dịch tính vào tiền hàng
            </h3>
            <span className="text-content-dark-3 text-xs">
              Cột "Phí phải thu (HĐ)" và "Đã thu trong kỳ" (đã trừ VAT) chứng minh (6) Tỷ lệ tiền về
              kỳ này = tổng đã thu ÷ tổng phí phải thu.
            </span>
          </div>
          <span className="text-content-dark-3 shrink-0 text-sm">
            {dealCount} giao dịch · {formatCurrencyVND(dealFeeTotal)} VNĐ
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-content-dark-3 border-border-1 border-b text-left">
                <th className="px-6 py-3 font-medium">Mã GD</th>
                <th className="px-6 py-3 font-medium">Dự án</th>
                <th className="px-6 py-3 font-medium">Căn</th>
                <th className="px-6 py-3 text-right font-medium">
                  Tiền hàng <span className="text-content-dark-4 font-normal">(Net)</span>
                </th>
                <th className="px-6 py-3 text-right font-medium">
                  Phí phải thu (HĐ) <span className="text-content-dark-4 font-normal">(Net)</span>
                </th>
                <th className="px-6 py-3 text-right font-medium">
                  Đã thu trong kỳ <span className="text-content-dark-4 font-normal">(Net)</span>
                </th>
                <th className="px-6 py-3 text-right font-medium">Tỷ lệ tiền về</th>
              </tr>
            </thead>
            <tbody className="divide-border-1 divide-y">
              {dealRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-content-dark-3 px-6 py-8 text-center">
                    Chưa có giao dịch nào tính vào tiền hàng trong kỳ này.
                  </td>
                </tr>
              ) : (
                dealRows.map((d) => (
                  <tr key={d.deal_id} className="text-content-dark-1">
                    <td className="px-6 py-3 font-medium">
                      <DealDetailLink dealId={d.deal_id}>{d.deal_code}</DealDetailLink>
                    </td>
                    <td className="px-6 py-3">
                      <ProjectDetailLink projectId={d.project_id}>
                        {d.project_name || (d.project_id ? `#${d.project_id}` : '—')}
                      </ProjectDetailLink>
                    </td>
                    <td className="px-6 py-3">{d.unit_number ?? '—'}</td>
                    <td className="px-6 py-3 text-right">
                      {formatCurrencyVND(Number(d.fee_calculation_price || 0))}
                    </td>
                    <td className="px-6 py-3 text-right">
                      {formatCurrencyVND(Number(d.invoice_amount || 0))}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex flex-col items-end">
                        <span className="text-data-green-default">
                          {formatCurrencyVND(Number(d.received_in_period || 0))}
                        </span>
                        {Number(d.received_in_period_gross || 0) !==
                        Number(d.received_in_period || 0) ? (
                          <span className="text-content-dark-3 text-xs">
                            Gross: {formatCurrencyVND(Number(d.received_in_period_gross || 0))}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-6 py-3 text-right">
                      {(() => {
                        const invoice = Number(d.invoice_amount || 0)
                        const received = Number(d.received_in_period || 0)
                        if (invoice <= 0) return '—'
                        // Per-deal shows the true ratio (may exceed 100% when a deal is
                        // over-collected); only the aggregate footer clamps to 100%.
                        const ratio = (received / invoice) * 100
                        return `${formatNumber(ratio, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
                      })()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {dealRows.length > 0 ? (
              <tfoot>
                <tr className="border-border-1 text-content-dark-1 border-t font-semibold">
                  <td className="px-6 py-3" colSpan={3}>
                    Tổng {dealCount} giao dịch
                  </td>
                  <td className="px-6 py-3 text-right">{formatCurrencyVND(dealFeeTotal)}</td>
                  <td className="px-6 py-3 text-right">{formatCurrencyVND(dealInvoiceTotal)}</td>
                  <td className="px-6 py-3 text-right">
                    <div className="flex flex-col items-end">
                      <span className="text-data-green-default">
                        {formatCurrencyVND(dealReceivedTotal)}
                      </span>
                      {dealReceivedGrossTotal !== dealReceivedTotal ? (
                        <span className="text-content-dark-3 text-xs font-normal">
                          Gross: {formatCurrencyVND(dealReceivedGrossTotal)}
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="text-data-green-default px-6 py-3 text-right">
                    {formatNumber(payoutDisplayPct, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                    %
                  </td>
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>
      </div>

      {item.note ? (
        <div className="border-border-1 rounded-lg border bg-white p-6">
          <div className="divide-border-1 flex flex-col divide-y">
            <DisplayFieldRow label="Ghi chú" value={item.note} className={'justify-start'} />
          </div>
        </div>
      ) : null}

      <div className="border-border-1 rounded-lg border bg-white p-6">
        <div className="typo-body-xl-semibold text-content-dark-1 mb-4">Tài liệu đính kèm</div>
        {item.attachments && item.attachments.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {item.attachments.map((file) => (
              <a
                key={file.id || file.file_name}
                href={file.view_url || file.download_url || '#'}
                target="_blank"
                rel="noreferrer"
                className="border-border-1 hover:bg-neutral-20 flex items-center justify-between gap-3 rounded-md border bg-white p-3 transition-colors"
                title={file.file_name}
              >
                <div className="flex flex-col overflow-hidden">
                  <span className="text-content-dark-1 truncate text-sm font-medium">
                    {file.file_name}
                  </span>
                  {file.size ? (
                    <span className="text-content-dark-3 mt-1 text-xs">
                      {Math.round((file.size || 0) / 1024)} KB
                    </span>
                  ) : null}
                </div>
                <span className="text-action-primary-red-default shrink-0 text-xs font-semibold">
                  Xem
                </span>
              </a>
            ))}
          </div>
        ) : (
          <div className="text-content-dark-3 text-sm">Không có tài liệu đính kèm</div>
        )}
      </div>
    </div>
  )
}
