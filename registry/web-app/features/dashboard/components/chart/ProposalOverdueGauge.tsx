import { ProposalsOverdueLevel } from '@/api/schema'
import { IconWarning } from '@/assets/icons'

type ProposalOverdueGaugeProps = {
  /** Total overdue proposals (gauge value) */
  count: number
  /** Pre-computed warning level from the API (low <30, medium <100, high >=100) */
  level: ProposalsOverdueLevel
}

// Count thresholds mirror the API gauge levels. HIGH is open-ended, so the
// needle is capped at HIGH_CAP for positioning only (the count text is exact).
const LOW_MAX = 30
const MEDIUM_MAX = 100
const HIGH_CAP = 200

// Gauge geometry (semicircle drawn over the top, 180° on the left → 0° on the right)
const CX = 120
const CY = 120
const R = 92
const STROKE = 18

// Soft shade-40 tones harmonised with the doughnut palette (globalColors *-40).
const LEVEL_META: Record<ProposalsOverdueLevel, { label: string; color: string }> = {
  [ProposalsOverdueLevel.low]: { label: 'Thấp', color: '#9bc5a4' },
  [ProposalsOverdueLevel.medium]: { label: 'Trung bình', color: '#e4bb8b' },
  [ProposalsOverdueLevel.high]: { label: 'Cao', color: '#cf6868' },
}

const ZONES: ReadonlyArray<{ level: ProposalsOverdueLevel; start: number; end: number }> = [
  { level: ProposalsOverdueLevel.low, start: 180, end: 120 },
  { level: ProposalsOverdueLevel.medium, start: 120, end: 60 },
  { level: ProposalsOverdueLevel.high, start: 60, end: 0 },
]

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (Math.PI / 180) * angleDeg
  return { x: cx + r * Math.cos(rad), y: cy - r * Math.sin(rad) }
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polar(cx, cy, r, startAngle)
  const end = polar(cx, cy, r, endAngle)
  const sweep = startAngle > endAngle ? 1 : 0
  return `M ${start.x} ${start.y} A ${r} ${r} 0 0 ${sweep} ${end.x} ${end.y}`
}

/** Map an overdue count to a 0..1 position along the gauge (thirds match the level bands). */
function countToFraction(count: number): number {
  const value = Math.max(0, count)
  let fraction: number
  if (value <= LOW_MAX) {
    fraction = (value / LOW_MAX) * (1 / 3)
  } else if (value <= MEDIUM_MAX) {
    fraction = 1 / 3 + ((value - LOW_MAX) / (MEDIUM_MAX - LOW_MAX)) * (1 / 3)
  } else {
    const capped = Math.min(value, HIGH_CAP)
    fraction = 2 / 3 + ((capped - MEDIUM_MAX) / (HIGH_CAP - MEDIUM_MAX)) * (1 / 3)
  }
  return Math.min(1, Math.max(0, fraction))
}

const ProposalOverdueGauge = ({ count, level }: ProposalOverdueGaugeProps) => {
  const active = LEVEL_META[level] ?? LEVEL_META[ProposalsOverdueLevel.low]
  const needleAngle = 180 - countToFraction(count) * 180
  const needle = polar(CX, CY, R - 8, needleAngle)

  return (
    <div className="flex flex-col items-center gap-3">
      <span className="typo-body-base-semibold text-content-dark-1">Chỉ số đề xuất quá hạn</span>

      <svg
        viewBox="0 0 240 132"
        className="w-full max-w-[240px]"
        role="img"
        aria-label={`Mức độ cảnh báo: ${active.label} (${count} phiếu quá hạn)`}
      >
        {ZONES.map((zone) => (
          <path
            key={zone.level}
            d={describeArc(CX, CY, R, zone.start, zone.end)}
            fill="none"
            stroke={LEVEL_META[zone.level].color}
            strokeWidth={STROKE}
            opacity={zone.level === level ? 1 : 0.4}
          />
        ))}

        <line
          x1={CX}
          y1={CY}
          x2={needle.x}
          y2={needle.y}
          stroke={active.color}
          strokeWidth={3}
          strokeLinecap="round"
        />
        <circle cx={CX} cy={CY} r={6} fill={active.color} />

        <text
          x={CX}
          y={CY - 22}
          textAnchor="middle"
          fontSize={30}
          fontWeight={700}
          fill={active.color}
        >
          {count}
        </text>
        <text x={CX} y={CY - 4} textAnchor="middle" fontSize={11} fill="#6b7280">
          phiếu quá hạn
        </text>
      </svg>

      <div className="flex items-center gap-2">
        <IconWarning size={18} color={active.color} />
        <span className="typo-body-base-semibold" style={{ color: active.color }}>
          Mức độ: {active.label}
        </span>
      </div>

      <p className="typo-body-sm text-content-dark-3 text-center">
        Cảnh báo số lượng đề xuất quá hạn (quá 4 ngày làm việc) chưa được duyệt.
      </p>
    </div>
  )
}

export default ProposalOverdueGauge
