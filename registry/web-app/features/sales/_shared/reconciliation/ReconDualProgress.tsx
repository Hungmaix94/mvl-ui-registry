import { formatPercent } from '@/utils/common'
import { Flex } from '@radix-ui/themes'
import { Info } from 'lucide-react'

import { cn } from '@/utils'

export interface ReconProgressSegment {
  /** Lũy kế tiến độ đầu kỳ (%). */
  fromPct: number | null
  /** Lũy kế tiến độ cuối kỳ (%). */
  toPct: number | null
}

export interface ReconDualProgressProps {
  base: ReconProgressSegment
  /** Phần 4 — tiến độ phí tăng thêm độc lập. Omit to render a single bar. */
  extra?: ReconProgressSegment | null
  baseLabel?: string
  extraLabel?: string
}

function clampPct(value: number | null): number {
  if (value == null || !Number.isFinite(value)) return 0
  return Math.min(100, Math.max(0, value))
}

function ProgressBar({
  segment,
  label,
  achievedClass,
  incrementClass,
  bulletClass,
}: {
  segment: ReconProgressSegment
  label: string
  /** Màu phần ĐÃ ĐẠT ĐƯỢC (0 → từ, lũy kế trước kỳ) — ĐẬM. */
  achievedClass: string
  /** Màu phần TĂNG THÊM kỳ này (từ → đến) — NHẠT (tint cùng tông). */
  incrementClass: string
  bulletClass: string
}) {
  const from = clampPct(segment.fromPct)
  const to = Math.max(from, clampPct(segment.toPct))

  return (
    <Flex direction="column" gap="1" className="w-full">
      <Flex align="center" justify="between" gap="2">
        <Flex align="center" gap="2" className="min-w-0">
          <span className={cn('size-2 shrink-0 rounded-[3px]', bulletClass)} />
          <span className="typo-body-sm-medium text-content-dark-2 truncate">{label}</span>
        </Flex>
        <Flex align="center" gap="2" className="shrink-0">
          {/* Dải lũy kế from → to lấy thẳng từ BE; FE không hiển thị Δ (= to − from) nữa. */}
          <span className="typo-body-sm-regular text-content-dark-3">
            {formatPercent(from)} → {formatPercent(to)}
          </span>
        </Flex>
      </Flex>
      <div className="bg-background-3 relative h-2 w-full overflow-hidden rounded-full">
        {/* Đã đạt được (0 → từ%, lũy kế trước kỳ) — màu ĐẬM. */}
        <div
          className={cn('absolute top-0 left-0 h-full', achievedClass)}
          style={{ width: `${from}%` }}
        />
        {/* Tăng thêm kỳ này (từ% → đến%) — màu NHẠT cùng tông. */}
        <div
          className={cn('absolute top-0 h-full', incrementClass)}
          style={{ left: `${from}%`, width: `${Math.max(0, to - from)}%` }}
        />
      </div>
    </Flex>
  )
}

/**
 * Dual progress bars (mockup `DualProgress5`): the base payment progress and the optional independent
 * extra-bonus (Phần 4) progress laid out **side by side**. Each bar shows a bullet + label, the
 * `from% → to%` range with a `+Δ% đợt này` pill, and shades lũy-kế-trước (grey) vs kỳ-này (accent —
 * base = blue, extra = purple). When `extra` is present an info line spells out that the two streams
 * track progress independently.
 */
function ReconDualProgress({
  base,
  extra,
  baseLabel = 'Tiến độ thanh toán',
  extraLabel = 'Tiến độ phí tăng thêm',
}: ReconDualProgressProps) {
  return (
    <Flex direction="column" gap="2" className="w-full">
      <Flex gap="5" wrap="wrap" align="start" className="w-full">
        <div className="min-w-[220px] flex-1">
          <ProgressBar
            segment={base}
            label={baseLabel}
            achievedClass="bg-data-blue-default"
            incrementClass="bg-data-blue-disabled"
            bulletClass="bg-data-blue-default"
          />
        </div>
        {extra && (
          <div className="min-w-[220px] flex-1">
            <ProgressBar
              segment={extra}
              label={extraLabel}
              achievedClass="bg-data-purple-default"
              incrementClass="bg-data-purple-disabled"
              bulletClass="bg-data-purple-default"
            />
          </div>
        )}
      </Flex>
      {extra && (
        <Flex align="center" gap="1.5" className="text-content-dark-3">
          <Info size={13} className="shrink-0" />
          <span className="typo-body-xs-regular">
            Hai luồng phí theo dõi tiến độ{' '}
            <span className="text-content-dark-2 font-medium">riêng biệt</span> — phí tăng thêm có
            thể đạt 100% trước khi base hoàn tất.
          </span>
        </Flex>
      )}
    </Flex>
  )
}

export default ReconDualProgress
