import { useMemo } from 'react'
import { Flex } from '@radix-ui/themes'
import { Chip, DotLoader, Text } from '@/components/ui'
import { ColoredValueVariant } from '@/api/schema'
import { formatCurrencyVND } from '@/utils'
import { formatRatePct } from '@/utils/common'
import {
  formatRateSpecEquivalent,
  formatRateSpecFraction,
  resolveRateTriple,
  type RateDisplayPair,
} from '@/utils/rate-spec'

import {
  LAD_LINE_STATUS_LABEL,
  LAD_LINE_STATUS_VARIANT,
  LadLineStatus,
} from '../../constants/lad-constants'
import type {
  LadBatchLine,
  LadF2AppliedRate,
  LadLinesSummary,
  LadPreviewLine,
} from '../../types/lad-types'
import { toNum } from '../../utils/lad-parse'
import { DeltaMoney } from './ladDelta'

interface LadImpactTableProps {
  /** All GD in the batch (full set + status). */
  lines: LadBatchLine[]
  /** Per-GD before/after fees from the preview (confirmed GD only). */
  previewLines: LadPreviewLine[]
  /** Σ Δ phí (ròng) — preview.delta_total. */
  deltaTotal?: number | null
  /** {expected, confirmed} for the footer "X/Y xác nhận". */
  summary?: LadLinesSummary | null
  isLoading?: boolean
  /** F2 (sàn liên kết) tham gia trong các GD không-loại-trừ + rate hiện hành — từ GET /{id}/f2s/. */
  f2Rows?: LadF2AppliedRate[]
  isLoadingF2s?: boolean
}

const GRID = 'grid grid-cols-[1.3fr_1.4fr_1fr_1fr_1fr_0.9fr] items-center gap-3'
const GRID_F2 = 'grid grid-cols-[1.8fr_0.7fr_1fr_1fr_1fr] items-center gap-3'

/** Display a `{pct, amt}` rate pair (decimal-string hoặc number) as "X%" or "X đ". */
// Cả 3 chỗ gọi đều là rate cụm F2 (HH F2, thưởng F2, giảm trừ phí F2) — dùng formatRatePct
// để ra đúng luật hiển thị min 2dp / max 3dp, thay vì `${n}%` thô (1.667% dấu chấm).
function rateDisplay(rate: { pct: string | number | null; amt: string | number | null }): string {
  if (rate.pct != null && rate.pct !== '') {
    const n = Number(rate.pct)
    if (Number.isFinite(n)) return formatRatePct(n)
  }
  if (rate.amt != null && rate.amt !== '') {
    const n = Number(rate.amt)
    if (Number.isFinite(n)) return `${formatCurrencyVND(n)} đ`
  }
  return '—'
}

/**
 * Hoa hồng F2 (read-only) từ `LadF2AppliedRate`: ưu tiên RateSpec (phân số / %) → %/đ dẫn xuất
 * (display_pct, 4dp) khi có spec; nếu không, dùng cache pct/amt thô. Mirror cách
 * LadConfigSnapshotTable / LadConfigDiffView hiển thị hoa hồng F2.
 */
function f2CommissionDisplay(rate: LadF2AppliedRate): RateDisplayPair {
  return resolveRateTriple(
    rate.pct_f2_commission_spec,
    rate.pct_f2_commission,
    rate.amt_f2_commission
  )
}

/**
 * Nội dung ô "Hoa hồng" F2: khi cấu hình kiểu phân số → giữ "x / y của z" làm chính (% dẫn xuất hiện
 * mờ "≈ …" bên dưới) thay vì chỉ % BE tính lại; ngược lại trả chuỗi %/đ như thường.
 */
function f2CommissionContent(rate: LadF2AppliedRate) {
  const spec = rate.pct_f2_commission_spec
  const fraction = formatRateSpecFraction(spec)
  if (!fraction) return rateDisplay(f2CommissionDisplay(rate))
  // Ô bảng hẹp ⇒ giữ hai dòng thay vì chuỗi "… ≈ …" một dòng, nhưng số sau "≈" vẫn lấy từ
  // formatRateSpecEquivalent như mọi màn khác — một quy tắc làm tròn, chỉ khác chỗ đặt.
  const equivalent = formatRateSpecEquivalent(spec)
  return (
    <span className="flex flex-col items-end">
      <span>{fraction}</span>
      {equivalent && (
        <span className="text-content-dark-3 text-xs font-normal">≈ {equivalent}</span>
      )}
    </span>
  )
}

/**
 * "Phạm vi tác động" — per-GD before/after fee + Δ + line status, with a totals row. Merges the
 * thin `lines` list (all GD + status) with the richer `previewLines` (before/after, confirmed GD
 * only) by deal id; GD without preview data (still `expected`) render fees as "—".
 */
export function LadImpactTable({
  lines,
  previewLines,
  deltaTotal,
  summary,
  isLoading,
  f2Rows = [],
  isLoadingF2s,
}: LadImpactTableProps) {
  const previewByDeal = useMemo(() => {
    const map = new Map<number, LadPreviewLine>()
    for (const p of previewLines) map.set(p.deal_id, p)
    return map
  }, [previewLines])

  // Tổng theo dòng không-loại-trừ (khớp định nghĩa deal_count/delta_total_sum của BE);
  // ưu tiên số từ preview, fallback before/after_total trên chính dòng (lô đã áp dụng không có preview).
  const totals = useMemo(() => {
    let before = 0
    let after = 0
    let delta = 0
    for (const line of lines) {
      if (line.line_status === LadLineStatus.excluded) continue
      const p = previewByDeal.get(line.deal)
      before += toNum(p?.before_total) ?? toNum(line.before_total) ?? 0
      after += toNum(p?.after_total) ?? toNum(line.after_total) ?? 0
      delta += toNum(p?.delta_total_fee) ?? toNum(line.delta_total) ?? 0
    }
    return { before, after, delta: deltaTotal ?? delta }
  }, [lines, previewByDeal, deltaTotal])

  const confirmed = summary?.applied ?? 0
  const total = summary
    ? (summary.draft ?? 0) +
      (summary.pending ?? 0) +
      (summary.applied ?? 0) +
      (summary.rejected ?? 0) +
      (summary.excluded ?? 0)
    : lines.length

  if (isLoading && lines.length === 0) {
    return (
      <div className="border-border-1 flex justify-center rounded-xl border py-12">
        <DotLoader />
      </div>
    )
  }

  return (
    <Flex direction="column" gap="6">
      <section className="border-border-1 overflow-hidden rounded-xl border">
        <div className="bg-surface-secondary-2 text-content-dark-3 px-5 py-2 text-xs font-semibold uppercase">
          <div className={GRID}>
            <span>Mã GD</span>
            <span>Khách hàng</span>
            <span className="text-right">Phí cũ</span>
            <span className="text-right">Phí mới</span>
            <span className="text-right">Δ</span>
            <span className="text-right">Trạng thái</span>
          </div>
        </div>

        <div className="divide-border-1 divide-y">
          {lines.length === 0 ? (
            <div className="text-content-dark-3 px-5 py-8 text-center text-sm">
              Chưa có giao dịch nào trong lô.
            </div>
          ) : (
            lines.map((line) => {
              const p = previewByDeal.get(line.deal)
              const before = toNum(p?.before_total) ?? toNum(line.before_total)
              const after = toNum(p?.after_total) ?? toNum(line.after_total)
              const status = (line.line_status ?? LadLineStatus.draft) as LadLineStatus
              return (
                <div key={line.id} className={`${GRID} px-5 py-3 text-sm`}>
                  <span className="text-content-dark-1 font-medium">{line.deal_code}</span>
                  <span className="text-content-dark-2 truncate">
                    {p?.customer_name || line.customer?.name || '—'}
                  </span>
                  <span
                    className={`text-right ${
                      after != null && before != null && after !== before
                        ? 'text-content-dark-3 line-through'
                        : 'text-content-dark-2'
                    }`}
                  >
                    {before != null ? `${formatCurrencyVND(before)} đ` : '—'}
                  </span>
                  <span className="text-content-dark-1 text-right font-medium">
                    {after != null ? `${formatCurrencyVND(after)} đ` : '—'}
                  </span>
                  <span className="text-right">
                    <DeltaMoney
                      value={toNum(p?.delta_total_fee) ?? toNum(line.delta_total) ?? null}
                    />
                  </span>
                  <span className="flex justify-end">
                    <Chip
                      label={LAD_LINE_STATUS_LABEL[status]}
                      variant={LAD_LINE_STATUS_VARIANT[status]}
                      size="small"
                    />
                  </span>
                </div>
              )
            })
          )}
        </div>

        {/* Totals */}
        {lines.length > 0 && (
          <div className="border-border-1 bg-surface-secondary-1 border-t-2 px-5 py-3.5">
            <div className={`${GRID} text-sm`}>
              <span className="text-content-dark-1 font-semibold">Tổng ({total} GD)</span>
              <span />
              <span className="text-content-dark-2 text-right font-semibold">
                {`${formatCurrencyVND(totals.before)} đ`}
              </span>
              <span className="text-content-dark-1 text-right font-semibold">
                {`${formatCurrencyVND(totals.after)} đ`}
              </span>
              <span className="text-right">
                <DeltaMoney value={totals.delta || null} />
              </span>
              <span className="text-content-dark-3 text-right text-xs">
                {confirmed}/{total} xác nhận
              </span>
            </div>
          </div>
        )}
      </section>

      <LadAffectedF2Table rows={f2Rows} isLoading={isLoadingF2s} />
    </Flex>
  )
}

/**
 * "F2 bị ảnh hưởng" — sàn liên kết tham gia (qua CommissionShare) trong các GD không-loại-trừ của
 * lô, kèm rate hiện hành (hoa hồng / thưởng / khấu trừ) lấy từ GET /{id}/f2s/. is_uniform=false ⇒
 * các GD của F2 đó mang % khác nhau → chip cảnh báo. Ẩn hẳn khi lô chỉ có GD nội bộ (không F2).
 */
function LadAffectedF2Table({
  rows,
  isLoading,
}: {
  rows: LadF2AppliedRate[]
  isLoading?: boolean
}) {
  if (isLoading && rows.length === 0) {
    return (
      <section className="border-border-1 overflow-hidden rounded-xl border">
        <div className="border-border-1 border-b px-5 py-3.5">
          <Text className="typo-body-base-semibold text-content-dark-1">F2 bị ảnh hưởng</Text>
        </div>
        <div className="flex justify-center py-10">
          <DotLoader />
        </div>
      </section>
    )
  }

  // Lô chỉ có GD nội bộ (không sàn liên kết) → không hiển thị bảng F2.
  if (rows.length === 0) return null

  return (
    <section className="border-border-1 overflow-hidden rounded-xl border">
      <div className="border-border-1 flex flex-col gap-0.5 border-b px-5 py-3.5">
        <Text className="typo-body-base-semibold text-content-dark-1">
          F2 bị ảnh hưởng ({rows.length} sàn)
        </Text>
        <Text className="typo-body-sm-regular text-content-dark-3">
          Sàn liên kết tham gia trong giao dịch của lô · hoa hồng / thưởng / khấu trừ hiện hành.
        </Text>
      </div>

      {/* Column header */}
      <div
        className={`bg-surface-secondary-2 text-content-dark-3 ${GRID_F2} px-5 py-2 text-xs font-semibold uppercase`}
      >
        <span>Sàn liên kết</span>
        <span className="text-right">Số GD</span>
        <span className="text-right">Hoa hồng</span>
        <span className="text-right">Thưởng</span>
        <span className="text-right">Khấu trừ</span>
      </div>

      <div className="divide-border-1 divide-y">
        {rows.map((row) => (
          <div key={row.exchange.id} className={`${GRID_F2} px-5 py-3 text-sm`}>
            <div className="flex min-w-0 flex-col">
              <span className="text-content-dark-1 truncate font-medium">{row.exchange.name}</span>
              <span className="text-content-dark-3 flex items-center gap-2 truncate text-xs">
                {row.exchange.code ? <span>{row.exchange.code}</span> : null}
                {!row.is_uniform && (
                  <Chip
                    label="% khác nhau giữa GD"
                    variant={ColoredValueVariant.YELLOW}
                    size="small"
                    showDot
                  />
                )}
              </span>
            </div>
            <span className="text-content-dark-2 text-right">{row.deal_count}</span>
            <span className="text-content-dark-1 text-right font-medium">
              {f2CommissionContent(row)}
            </span>
            <span className="text-content-dark-1 text-right font-medium">
              {rateDisplay({ pct: row.pct_f2_bonus, amt: row.amt_f2_bonus })}
            </span>
            <span className="text-content-dark-1 text-right font-medium">
              {rateDisplay(row.fee_deduction_to_f2)}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}

export default LadImpactTable
