import { useMemo, useState } from 'react'
import { Chip, Dash, TextField } from '@/components/ui'
import { IconMagnifyingglass, IconReceipt } from '@/assets/icons'
import { ColoredValueVariant, LinkedExchangeRevenueLineF2_source } from '@/api/schema'
import { formatCurrencyVND, formatNumber } from '@/utils/common'
import useAppConstant from '@/hooks/useAppConstant'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import {
  useLinkedExchangeRevenueLines,
  type SlkRevenueLine,
} from '@/features/accounting/linked-exchange-monthly-commissions/services/linked-exchange-monthly-commission-service'
import { groupLinesByF2Source } from './group-f2-source-lines'

type Props = {
  monthlyId: number
  /**
   * Render only these lines instead of the whole statement — used by the pool screen to
   * show just the transactions feeding that one pool. The caller scopes them (source +
   * director) so this component stays a pure presenter of whatever it is handed.
   */
  lines?: SlkRevenueLine[]
  /**
   * Render a SINGLE table under this heading instead of one table per F2 source. A pool
   * is already one source, so the per-source split would just be one filled table and two
   * empty ones.
   */
  singleTitle?: string
}

const toNum = (value: string | number | null | undefined): number => Number(value ?? 0)

/** Percent with a fixed 2 decimals, e.g. 38 → "38,00%". Named to avoid colliding
 *  with the min-decimals `formatPct` exported from @/utils/common. */
const formatFixedPct = (pct: number): string =>
  `${formatNumber(pct, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`

/** participation_pct "50" → "50,00%" (already a percent value) */
const formatParticipation = (pct: string | number | null | undefined): string =>
  formatFixedPct(toNum(pct))

/** Known F2 sources, in display order — one table each. Human labels come from the
 *  server via useAppConstant (LINKED_EXCHANGE_REVENUE_LINE_F2_SOURCE_CHOICES); only the
 *  ordering is a frontend decision. */
const F2_SOURCE_ORDER: LinkedExchangeRevenueLineF2_source[] = [
  LinkedExchangeRevenueLineF2_source.linked,
  LinkedExchangeRevenueLineF2_source.company,
  LinkedExchangeRevenueLineF2_source.director,
]

type SectionProps = {
  title: string
  lines: SlkRevenueLine[]
  isLoading: boolean
  hasError: boolean
  isSearching: boolean
}

/** One F2-source table (either phòng sàn liên kết or công ty). Each table is a
 *  single source, so the per-row "Nguồn" column is redundant and dropped here. */
function RevenueLinesSection({ title, lines, isLoading, hasError, isSearching }: SectionProps) {
  const totals = useMemo(
    () =>
      lines.reduce(
        (acc, line) => {
          acc.agencyFee += toNum(line.agency_fee)
          acc.commissionF2 += toNum(line.commission_before_vat)
          acc.slkFull += toNum(line.slk_full)
          acc.slkRevenue += toNum(line.slk_revenue)
          return acc
        },
        { agencyFee: 0, commissionF2: 0, slkFull: 0, slkRevenue: 0 }
      ),
    [lines]
  )

  return (
    <div className="border-border-1 overflow-hidden rounded-lg border bg-white shadow-sm">
      {/* Section header */}
      <div className="border-border-1 flex flex-wrap items-center justify-between gap-3 border-b bg-white px-6 py-4">
        <div className="text-[13px] font-bold text-neutral-900">{title}</div>
        <Chip label={`${lines.length} giao dịch`} variant={ColoredValueVariant.BLUE} />
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-border-1 bg-neutral-20 border-b text-[12px] font-medium text-neutral-500">
              <th className="px-4 py-3 font-medium whitespace-nowrap">STT</th>
              <th className="px-4 py-3 font-medium whitespace-nowrap">Dự án</th>
              <th className="px-4 py-3 font-medium whitespace-nowrap">Mã căn</th>
              <th className="px-4 py-3 font-medium whitespace-nowrap">Sàn F2</th>
              <th className="px-4 py-3 text-right font-medium whitespace-nowrap">% tham gia</th>
              <th className="px-4 py-3 text-right font-medium whitespace-nowrap">Phí ĐL</th>
              {/* The whole commission MVL owes this exchange for the unit, not the rounds
                  reconciled so far (business rule 2026-07-27). */}
              <th className="px-4 py-3 text-right font-medium whitespace-nowrap">HH F2 (cả căn)</th>
              <th className="px-4 py-3 text-right font-medium whitespace-nowrap">
                Doanh thu SLK toàn căn
              </th>
              <th className="px-4 py-3 text-right font-medium whitespace-nowrap">
                Tỷ lệ thanh toán
              </th>
              <th className="px-4 py-3 text-right font-medium whitespace-nowrap">Doanh thu SLK</th>
            </tr>
          </thead>
          <tbody className="divide-border-1 divide-y bg-white">
            {isLoading ? (
              <tr>
                <td colSpan={10} className="px-6 py-12 text-center text-[13px] text-neutral-400">
                  Đang tải dữ liệu...
                </td>
              </tr>
            ) : hasError ? (
              <tr>
                <td
                  colSpan={10}
                  className="text-data-red-default px-6 py-12 text-center text-[13px]"
                >
                  Không tải được chi tiết giao dịch.
                </td>
              </tr>
            ) : lines.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center justify-center gap-2 text-neutral-400">
                    <IconReceipt className="h-8 w-8 text-neutral-300" />
                    <span className="text-[13px]">
                      {isSearching
                        ? 'Không có giao dịch khớp tìm kiếm'
                        : 'Chưa có giao dịch nào trong kỳ'}
                    </span>
                  </div>
                </td>
              </tr>
            ) : (
              lines.map((line, index) => {
                const slkFull = toNum(line.slk_full)
                const slkRevenue = toNum(line.slk_revenue)
                return (
                  <tr key={line.id} className="hover:bg-neutral-50">
                    <td className="px-4 py-3.5 text-[13px] text-neutral-400">{index + 1}</td>
                    <td className="px-4 py-3.5 text-[13px] font-semibold text-neutral-900">
                      {line.project_name || '—'}
                    </td>
                    <td className="px-4 py-3.5">
                      <code className="bg-neutral-20 rounded px-1.5 py-0.5 text-xs text-neutral-700">
                        {line.unit_number || '—'}
                      </code>
                    </td>
                    <td className="px-4 py-3.5 text-[13px] text-neutral-700">
                      {line.exchange_name || '—'}
                    </td>
                    <td className="px-4 py-3.5 text-right text-[13px] text-neutral-700">
                      {formatParticipation(line.participation_pct)}
                    </td>
                    <td className="px-4 py-3.5 text-right text-[13px] text-neutral-700">
                      {formatCurrencyVND(toNum(line.agency_fee))}
                    </td>
                    <td className="px-4 py-3.5 text-right text-[13px] text-neutral-500">
                      {formatCurrencyVND(toNum(line.commission_before_vat))}
                    </td>
                    <td className="px-4 py-3.5 text-right text-[13px] font-medium text-neutral-900">
                      {formatCurrencyVND(slkFull)}
                    </td>
                    <td
                      className="px-4 py-3.5 text-right text-[13px] text-neutral-700"
                      title={
                        line.slk_progress_source === 'PINNED'
                          ? 'Kế toán ghim'
                          : line.slk_progress_source === 'COLLECTED'
                            ? 'Theo tiền thu'
                            : undefined
                      }
                    >
                      {formatFixedPct(toNum(line.slk_progress_pct))}
                    </td>
                    <td className="px-4 py-3.5 text-right text-[13px] font-semibold">
                      {slkRevenue > 0 ? (
                        <span className="text-brand-primary">{formatCurrencyVND(slkRevenue)}</span>
                      ) : (
                        <Dash />
                      )}
                    </td>
                  </tr>
                )
              })
            )}

            {lines.length > 0 && (
              <tr className="border-border-1 bg-neutral-30 border-t-2 text-[13px] font-bold text-neutral-900">
                <td colSpan={4} className="px-4 py-4">
                  TỔNG CỘNG
                </td>
                <td className="px-4 py-4" />
                <td className="px-4 py-4 text-right">{formatCurrencyVND(totals.agencyFee)}</td>
                <td className="px-4 py-4 text-right text-neutral-500">
                  {formatCurrencyVND(totals.commissionF2)}
                </td>
                <td className="px-4 py-4 text-right">{formatCurrencyVND(totals.slkFull)}</td>
                <td className="px-4 py-4" />
                <td className="text-brand-primary px-4 py-4 text-right">
                  {formatCurrencyVND(totals.slkRevenue)}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export const CommSlkRevenueLinesTable = ({ monthlyId, lines: scopedLines, singleTitle }: Props) => {
  // Fetched unconditionally (hooks cannot be conditional); when the caller passes its own
  // lines this costs nothing extra — react-query serves the same key from cache.
  const { data, isLoading, error } = useLinkedExchangeRevenueLines(monthlyId)
  const [search, setSearch] = useState('')

  const { keysMap } = useAppConstant({
    module: 'accounting',
    keys: [APP_CONSTANT_KEY.ACCOUNTING.LINKED_EXCHANGE_REVENUE_LINE_F2_SOURCE_CHOICES],
  })
  const f2SourceLabels = keysMap.get(
    APP_CONSTANT_KEY.ACCOUNTING.LINKED_EXCHANGE_REVENUE_LINE_F2_SOURCE_CHOICES
  ) as Record<string, string> | undefined

  const lines = useMemo<SlkRevenueLine[]>(() => scopedLines ?? data ?? [], [scopedLines, data])

  const trimmedQuery = search.trim()
  const isSearching = trimmedQuery.length > 0

  const filtered = useMemo(() => {
    const query = trimmedQuery.toLowerCase()
    if (!query) return lines
    return lines.filter((line) =>
      [line.project_name, line.unit_number, line.exchange_name, line.deal_code]
        .filter(Boolean)
        .some((field) => field.toLowerCase().includes(query))
    )
  }, [lines, trimmedQuery])

  // Pool scope -> one table under the caller's heading. Otherwise one section per known
  // source, in fixed order, titled with the server-provided labels.
  const sections = useMemo(
    () =>
      singleTitle != null
        ? [{ key: 'pool', title: singleTitle, lines: filtered }]
        : groupLinesByF2Source(filtered, F2_SOURCE_ORDER).map((section) => ({
            key: section.source as string,
            title: f2SourceLabels?.[section.source] ?? section.source,
            lines: section.lines,
          })),
    [filtered, f2SourceLabels, singleTitle]
  )

  return (
    <div className="flex flex-col gap-5">
      {/* Shared toolbar — one search drives both source tables */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[13px] font-bold text-neutral-900">
            Chi tiết doanh thu theo giao dịch F2
          </div>
          <div className="mt-0.5 text-[11px] text-neutral-400">
            Đóng góp doanh thu SLK từng căn — cột{' '}
            <span className="font-medium text-neutral-500">Doanh thu SLK</span> = Doanh thu SLK toàn
            căn × Tỷ lệ thanh toán
          </div>
        </div>
        <div className="w-[300px] max-w-full">
          <TextField
            value={search}
            onChange={setSearch}
            placeholder="Tìm theo dự án, mã căn, sàn F2..."
            prefix={<IconMagnifyingglass className="h-4 w-4" />}
          />
        </div>
      </div>

      {sections.map((section) => (
        <RevenueLinesSection
          key={section.key}
          title={section.title}
          lines={section.lines}
          isLoading={isLoading}
          hasError={!!error}
          isSearching={isSearching}
        />
      ))}
    </div>
  )
}
