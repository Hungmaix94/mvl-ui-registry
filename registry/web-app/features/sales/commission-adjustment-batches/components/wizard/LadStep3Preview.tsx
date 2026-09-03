import { useEffect, useMemo, useState } from 'react'
import { Flex } from '@radix-ui/themes'
import { DotLoader, Text } from '@/components/ui'
import { formatCurrencyVND } from '@/utils'
import { formatDate } from '@/utils/date-utils'
import toastService from '@/services/toast-service'
import { extractErrorMessage } from '@/utils/error-utils'
import { useDeals, type Deal } from '@/features/sales/deals/services/deal-service'

import { usePreviewLad } from '../../services/commission-adjustment-batch-service'
import type { LadPreviewResult } from '../../types/lad-types'
import { toNum } from '../../utils/lad-parse'

export interface LadStep3PreviewProps {
  batchId: number
  /** Host SA — joins the thin preview lines with deal data (Căn / ngày ký / Giá HĐ). */
  saleAllocationId: number
}

const GRID = 'grid grid-cols-[1.1fr_1.6fr_1.1fr_1.1fr_1.1fr_1fr] items-center gap-3'

/** BE trả mã cảnh báo thô (manual_override_reasons) — dịch sang tiếng Việt dễ hiểu cho người duyệt. */
const WARNING_LABELS: Record<string, string> = {
  config_source_manual: 'GD có bản ghi cấu hình chỉnh tay riêng, lô có thể ghi đè.',
  custom_share_override: 'GD có khoản hoa hồng đã chỉnh tay riêng (is_custom_override).',
  revenue_overridden:
    'GD đã được duyệt điều chỉnh doanh thu riêng — mặc định lô KHÔNG ghi đè số này (bật "Ghi đè cả những GD đã có điều chỉnh doanh thu riêng" ở bước Mô tả lô nếu muốn áp số của lô).',
  revenue_differs_from_batch:
    'Số doanh thu trong lô khác với số GD đang ghi nhận — kiểm tra lại trước khi áp dụng.',
  revenue_mode_mismatch:
    'Lô không khai báo chế độ doanh thu khớp với GD — số doanh thu của GD sẽ được giữ nguyên.',
}

function warningLabel(code: string): string {
  return WARNING_LABELS[code] ?? code
}

/** Page cap for the deal join; rows beyond it gracefully fall back to "—". */
const DEAL_JOIN_PAGE_SIZE = 100

/** Inflow Δ per mockup: mono, green for any non-zero value, sign prefix, no "đ" suffix. */
function InflowDelta({ value }: { value: number | null }) {
  if (value == null) return <span className="text-content-dark-3">—</span>
  if (value === 0) return <span className="text-content-dark-3 font-mono">0</span>
  const sign = value > 0 ? '+' : ''
  return (
    <span className="text-data-green-default font-mono font-bold">
      {`${sign}${formatCurrencyVND(value)}`}
    </span>
  )
}

/**
 * Bước 3 — Tác động. Dry-run via POST /preview/ (uncached — re-fires on every visit so a Step-2
 * edit is always reflected). Renders the mockup's "Inflow · diff per GD" table: Mã GD ·
 * Khách/Căn (+ "ký" date) · Giá HĐ · Phí cũ (struck) · Phí mới · Δ, plus a totals row. CĂN /
 * ngày ký / GIÁ HĐ are not in the preview payload (doc §4.1) — they're joined client-side from
 * the SA's deal list, mirroring LadAddDealDialog's column sources.
 */
export function LadStep3Preview({ batchId, saleAllocationId }: LadStep3PreviewProps) {
  const preview = usePreviewLad()
  const [result, setResult] = useState<LadPreviewResult | null>(null)

  const { data: dealsData } = useDeals(
    { sales_allocation: saleAllocationId, page_size: DEAL_JOIN_PAGE_SIZE },
    { enabled: !!saleAllocationId }
  )
  const dealById = useMemo(() => {
    const map = new Map<number, Deal>()
    for (const deal of dealsData?.results ?? []) map.set(deal.id, deal)
    return map
  }, [dealsData])

  useEffect(() => {
    let cancelled = false
    preview
      .mutateAsync(batchId)
      .then((res) => {
        if (!cancelled) setResult(res ?? null)
      })
      .catch((err) => {
        if (!cancelled) toastService.error(extractErrorMessage(err))
      })
    return () => {
      cancelled = true
    }
    // Re-run only when the batch changes; preview is intentionally uncached.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchId])

  const lines = result?.lines ?? []

  const totals = useMemo(() => {
    let before = 0
    let after = 0
    let price = 0
    let priceComplete = lines.length > 0
    for (const line of lines) {
      before += toNum(line.before_total) ?? 0
      after += toNum(line.after_total) ?? 0
      const dealPrice = toNum(dealById.get(line.deal_id)?.listed_price)
      if (dealPrice == null) priceComplete = false
      else price += dealPrice
    }
    return {
      before,
      after,
      price: priceComplete ? price : null,
      delta: toNum(result?.delta_total) ?? after - before,
    }
  }, [lines, result, dealById])

  if (preview.isPending && !result) {
    return (
      <Flex justify="center" align="center" className="py-16">
        <DotLoader />
      </Flex>
    )
  }

  return (
    <section className="border-border-1 overflow-hidden rounded-xl border">
      <div className="border-border-1 flex flex-col gap-0.5 border-b px-5 py-3.5">
        <Text className="typo-body-base-semibold text-content-dark-1">
          Inflow · diff per GD ({lines.length})
        </Text>
        <Text className="text-content-dark-3 typo-body-sm-regular">
          Không tính GD đã loại trừ. Mỗi GD sinh 1 event inflow khi áp dụng.
        </Text>
      </div>

      {/* Column header */}
      <div
        className={`bg-surface-secondary-2 text-content-dark-3 ${GRID} px-5 py-2 text-xs font-semibold uppercase`}
      >
        <span>Mã GD</span>
        <span>Khách / Căn</span>
        <span className="text-right">Giá HĐ</span>
        <span className="text-right">Phí cũ</span>
        <span className="text-right">Phí mới</span>
        <span className="text-right">Δ</span>
      </div>

      <div className="divide-border-1 divide-y">
        {lines.length === 0 ? (
          <div className="text-content-dark-3 px-5 py-8 text-center text-sm">
            Chưa có giao dịch để xem trước.
          </div>
        ) : (
          lines.map((line) => {
            const before = toNum(line.before_total)
            const after = toNum(line.after_total)
            const changed = after != null && before != null && after !== before
            const deal = dealById.get(line.deal_id)
            const unit = deal?.product_inventory?.unit_number || deal?.product_inventory?.code || ''
            const signedDate = deal?.rate_determination_date
              ? formatDate(deal.rate_determination_date)
              : ''
            const subLine = [unit, signedDate ? `ký ${signedDate}` : ''].filter(Boolean).join(' · ')
            const price = toNum(deal?.fee_calculation_price)
            return (
              <div key={line.deal_id} className={`${GRID} px-5 py-3 text-sm`}>
                <span className="text-content-dark-1 font-mono font-semibold">
                  {line.deal_code}
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="text-content-dark-1 truncate">{line.customer_name || '—'}</span>
                  {subLine && (
                    <span className="text-content-dark-3 truncate text-xs">{subLine}</span>
                  )}
                </span>
                <span className="text-content-dark-1 text-right font-mono">
                  {price != null ? formatCurrencyVND(price) : '—'}
                </span>
                <span
                  className={`text-right font-mono ${
                    changed ? 'text-content-dark-3 line-through' : 'text-content-dark-2'
                  }`}
                >
                  {before != null ? formatCurrencyVND(before) : '—'}
                </span>
                <span className="text-content-dark-1 text-right font-mono font-semibold">
                  {after != null ? formatCurrencyVND(after) : '—'}
                </span>
                <span className="text-right">
                  <InflowDelta value={toNum(line.delta_total_fee)} />
                </span>
              </div>
            )
          })
        )}
      </div>

      {lines.length > 0 && (
        <div className="border-content-dark-1 bg-surface-secondary-2 border-t-2 px-5 py-3.5">
          <div className={`${GRID} text-sm`}>
            <span className="text-content-dark-1 col-span-2 font-semibold">Tổng inflow</span>
            <span className="text-content-dark-1 text-right font-mono font-semibold">
              {totals.price != null ? formatCurrencyVND(totals.price) : '—'}
            </span>
            <span className="text-content-dark-2 text-right font-mono font-semibold">
              {formatCurrencyVND(totals.before)}
            </span>
            <span className="text-content-dark-1 text-right font-mono font-semibold">
              {formatCurrencyVND(totals.after)}
            </span>
            <span className="text-right">
              <InflowDelta value={totals.delta || null} />
            </span>
          </div>
        </div>
      )}

      {lines.some((l) => l.warnings && l.warnings.length > 0) && (
        <div className="border-action-primary-yellow-default bg-surface-secondary-1 m-4 rounded-lg border p-3">
          <Text className="typo-body-sm-semibold text-content-dark-1 mb-1 block">Cảnh báo</Text>
          {lines.flatMap((l) =>
            (l.warnings ?? []).map((w, i) => (
              <Text
                key={`${l.deal_id}-${i}`}
                className="typo-body-sm-regular text-content-dark-2 block"
              >
                • {l.deal_code}: {warningLabel(w)}
              </Text>
            ))
          )}
        </div>
      )}
    </section>
  )
}

export default LadStep3Preview
