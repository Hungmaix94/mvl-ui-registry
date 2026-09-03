type ProposalOverdueRatioBarProps = {
  /** Overdue proposals ratio this month (0-100) */
  overdueRatio: number
  /** On-time proposals ratio this month (0-100) */
  onTimeRatio: number
  /** Overdue proposals count this month */
  overdueCount: number
  /** On-time proposals count this month */
  onTimeCount: number
}

// Soft shade-40 tones harmonised with the doughnut palette (green-40 / red-40).
const ON_TIME_COLOR = '#9bc5a4'
const OVERDUE_COLOR = '#cf6868'

// Only print the inline percentage when the segment is wide enough to fit it.
const MIN_LABEL_WIDTH_PCT = 12

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(100, Math.max(0, value))
}

function formatPercent(value: number): string {
  return `${Math.round(value)}%`
}

type LegendItemProps = {
  color: string
  label: string
  count: number
}

const LegendItem = ({ color, label, count }: LegendItemProps) => (
  <div className="flex items-center gap-2">
    <span className="h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: color }} />
    <span className="typo-body-sm-regular text-content-dark-2">
      {label} <span className="typo-body-sm-semibold text-content-dark-1">({count})</span>
    </span>
  </div>
)

const ProposalOverdueRatioBar = ({
  overdueRatio,
  onTimeRatio,
  overdueCount,
  onTimeCount,
}: ProposalOverdueRatioBarProps) => {
  const onTimePct = clampPercent(onTimeRatio)
  const overduePct = clampPercent(overdueRatio)
  const hasData = onTimePct + overduePct > 0

  return (
    <div className="flex w-full flex-col gap-3">
      <span className="typo-body-base-semibold text-content-dark-1">
        Tỷ lệ đề xuất quá hạn / đúng hạn
      </span>

      {hasData ? (
        <div className="flex h-9 w-full overflow-hidden rounded-lg">
          {onTimePct > 0 && (
            <div
              className="flex items-center justify-center"
              style={{ width: `${onTimePct}%`, backgroundColor: ON_TIME_COLOR }}
              title={`Đúng hạn: ${formatPercent(onTimePct)}`}
            >
              {onTimePct >= MIN_LABEL_WIDTH_PCT && (
                <span className="typo-body-sm-semibold text-content-dark-1">
                  {formatPercent(onTimePct)}
                </span>
              )}
            </div>
          )}
          {overduePct > 0 && (
            <div
              className="flex items-center justify-center"
              style={{ width: `${overduePct}%`, backgroundColor: OVERDUE_COLOR }}
              title={`Quá hạn: ${formatPercent(overduePct)}`}
            >
              {overduePct >= MIN_LABEL_WIDTH_PCT && (
                <span className="typo-body-sm-semibold text-content-dark-1">
                  {formatPercent(overduePct)}
                </span>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-background-2 text-content-dark-3 typo-body-sm flex h-9 w-full items-center justify-center rounded-lg">
          Chưa có đề xuất nào trong tháng
        </div>
      )}

      <div className="flex flex-wrap items-center gap-5">
        <LegendItem color={ON_TIME_COLOR} label="Đúng hạn" count={onTimeCount} />
        <LegendItem color={OVERDUE_COLOR} label="Quá hạn" count={overdueCount} />
      </div>

      <p className="typo-body-sm text-content-dark-3">
        Theo dõi tỷ lệ đề xuất quá hạn và đúng hạn trong tháng.
      </p>
    </div>
  )
}

export default ProposalOverdueRatioBar
