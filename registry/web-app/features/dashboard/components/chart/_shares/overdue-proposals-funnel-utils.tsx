import { getColorForLabelByIndex } from '@/components/ui/chart/utils'
import { formatNumber } from '@/utils/common'

const MIN_WIDTH_FACTOR = 0.04

// Charts render raw hex, NOT design tokens: CSS custom properties don't resolve
// inside SVG <path>/<text> fills & strokes (Recharts draws to SVG). Centralised
// here so the two overdue-proposals funnel charts stay visually identical.
const LABEL_NAME_COLOR = '#4B5563'
const LABEL_RATIO_COLOR = '#1F2937'

export const OVERDUE_PROPOSALS_FUNNEL_ROW_HEIGHT = 44

/** Slice separator stroke (white) — see note above on raw hex inside SVG. */
export const OVERDUE_PROPOSALS_FUNNEL_STROKE = '#ffffff'

export type OverdueProposalsFunnelItem = {
  branch_id: number
  branch_name: string
  overdue_count: number
  total_count: number
  ratio: number
}

export type FunnelBand = OverdueProposalsFunnelItem & {
  fill: string
  value: number
  ratioLabel: string
}

type FunnelTooltipProps = {
  active?: boolean
  payload?: Array<{ payload: FunnelBand }>
}

export const OVERDUE_PROPOSALS_FUNNEL_LABEL_COLORS = {
  name: LABEL_NAME_COLOR,
  ratio: LABEL_RATIO_COLOR,
} as const

function funnelWidth(ratio: number, maxRatio: number): number {
  if (maxRatio <= 0) return 1
  const maxScaled = Math.sqrt(maxRatio)
  const scaled = Math.sqrt(Math.max(ratio, 0))
  return Math.max(scaled, maxScaled * MIN_WIDTH_FACTOR)
}

export function formatOverdueRatio(ratio: number): string {
  if (!Number.isFinite(ratio)) return '0'
  return Number.isInteger(ratio)
    ? formatNumber(ratio)
    : formatNumber(ratio, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
}

export function buildOverdueProposalsFunnelBands(
  items: OverdueProposalsFunnelItem[]
): FunnelBand[] {
  if (!items.length) return []

  const sorted = [...items].sort((a, b) => b.ratio - a.ratio)
  const maxRatio = Math.max(...sorted.map((item) => item.ratio))

  return sorted.map((item, index) => ({
    ...item,
    fill: getColorForLabelByIndex(index).backgroundColor,
    value: funnelWidth(item.ratio, maxRatio),
    ratioLabel: `${formatOverdueRatio(item.ratio)}%`,
  }))
}

export function OverdueProposalsFunnelTooltip({ active, payload }: FunnelTooltipProps) {
  if (!active || !payload?.length) return null
  const band = payload[0].payload
  return (
    <div className="border-border-1 rounded-lg border bg-white p-3 shadow-lg">
      <p className="typo-body-sm-semibold text-content-dark-1 mb-1">{band.branch_name}</p>
      <p className="typo-body-sm-regular text-content-dark-2">
        Quá hạn / tổng: {band.overdue_count}/{band.total_count}
      </p>
      <p className="typo-body-sm-semibold text-content-dark-1 mt-1">
        Tỷ lệ: {formatOverdueRatio(band.ratio)}%
      </p>
    </div>
  )
}
