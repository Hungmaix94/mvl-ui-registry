import React, { useMemo } from 'react'
import { Cell, Label, LegendPayload, Pie, PieChart } from 'recharts'
import { RADIAN } from './constants'
import { getColorForLabelByIndex } from './utils'
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartTooltip,
  ChartTooltipContent,
} from '../chart'
import { toKebabCase } from '@/lib/utils'
import { cn } from '@/utils'
import { formatCurrencyVND, formatNumber } from '@/utils/common.ts'

export interface ChartSegment {
  label: string
  percentage: number
  count?: number | string
}

const COMPACT_HEIGHT = 320
const COMPACT_INNER_RADIUS = 40
const COMPACT_OUTER_RADIUS = 95
// const COMPACT_MAX_WIDTH = 320
const DEFAULT_HEIGHT = 500
const DEFAULT_INNER_RADIUS = 60
const DEFAULT_OUTER_RADIUS = 170
// const DEFAULT_MAX_WIDTH = 600

interface Props {
  segments: ChartSegment[]
  height?: number
  compact?: boolean
}

function legendFormatter(compact: boolean) {
  return (_: any, entry: LegendPayload) => {
    return (
      <span className={cn('text-content-dark-1', compact ? 'mr-2 text-[10px]' : 'mr-4 text-xs')}>
        {(entry?.payload as any)?.label}
      </span>
    )
  }
}

export const DoughnutChart: React.FC<Props> = ({
  segments = [],
  height: heightProp,
  compact = false,
}) => {
  const height = heightProp ?? (compact ? COMPACT_HEIGHT : DEFAULT_HEIGHT)
  const innerRadius = compact ? COMPACT_INNER_RADIUS : DEFAULT_INNER_RADIUS
  const outerRadius = compact ? COMPACT_OUTER_RADIUS : DEFAULT_OUTER_RADIUS
  const labelLineLength = compact ? 14 : 25

  const totalPercentage = useMemo(
    () => segments?.reduce((sum, d) => sum + d.percentage, 0),
    [segments]
  )
  const total = useMemo(
    () => segments?.reduce((sum, d) => sum + (Number(d.count) || 0), 0),
    [segments]
  )

  const chartConfig = useMemo(() => {
    const config: ChartConfig = {}
    if (segments) {
      segments.forEach((segment, index) => {
        const kebabLabel = toKebabCase(segment.label)
        config[kebabLabel] = {
          label: segment.label,
          color: getColorForLabelByIndex(index).backgroundColor,
        }
      })
    }
    return config
  }, [segments])

  const useCustomLegend = segments.length > 7

  if (!segments || segments.length === 0 || total === 0) {
    return (
      <div
        className={'text-content-dark-3 flex h-full w-full flex-col items-center justify-center'}
      >
        <h6 className={'text-content-dark-3'}>Không tìm thấy dữ liệu</h6>
        <p className={'typo-body-lg'}>Không có kết quả phù hợp với bộ lọc đã chọn.</p>
      </div>
    )
  }

  const renderLabel = (props: any) => {
    const { cx, cy, midAngle, outerRadius: propsOuterRadius, value } = props
    const lineLength = labelLineLength
    const percentValue = typeof value === 'number' ? value : Number(value ?? 0)

    if (percentValue <= 5 || (percentValue <= 8 && props.count >= 100)) {
      return null
    }

    const rawPercent = totalPercentage > 0 ? (percentValue / totalPercentage) * 100 : 0

    const radius = propsOuterRadius
    const angleRad = -midAngle * RADIAN
    const dx = Math.cos(angleRad)
    const dy = Math.sin(angleRad)

    const x1 = cx + radius * dx
    const y1 = cy + radius * dy
    const x2 = cx + (radius + lineLength) * dx
    const y2 = cy + (radius + lineLength) * dy

    const isRightSide = x2 > cx
    const isTopSide = y2 < cy

    let underlineLength = compact ? 32 : 40
    let labelOffsetY = compact ? 8 : 10
    let labelMarginX = 4

    if (!isRightSide && rawPercent >= 95) {
      underlineLength = compact ? 10 : 26
      labelMarginX = 2
    }

    const xUnderlineEnd = x2 + (isRightSide ? underlineLength : -underlineLength)

    const xText = xUnderlineEnd + (isRightSide ? labelMarginX : -labelMarginX)
    const yText = y2 + (isTopSide ? -labelOffsetY : labelOffsetY)

    const percent = formatNumber(rawPercent, { minimumFractionDigits: 0, maximumFractionDigits: 1 }) + '%'

    return (
      <g>
        {/* connector line */}
        <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#000" strokeWidth={1} />
        {/* underline */}
        <line x1={x2} y1={y2} x2={xUnderlineEnd} y2={y2} stroke="#000" strokeWidth={1} />
        <text
          x={xText}
          y={yText}
          textAnchor={xText > cx ? 'start' : 'end'}
          dominantBaseline="central"
          fontFamily={'Inter, sans-serif'}
          fontSize={12}
          fontWeight={600}
          fill={'#000000'}
        >
          {percent}
        </text>
      </g>
    )
  }

  return (
    <div className="relative flex w-full flex-col overflow-visible">
      <ChartContainer
        config={chartConfig}
        style={{ height: `${height}px` }}
        className={cn(
          'mx-auto w-full overflow-visible',
          compact ? 'max-w-[320px]' : 'max-w-[600px]'
        )}
        initialDimension={{
          width: compact ? 320 : 600,
          height: compact ? Math.min(height, 320) : 400,
        }}
      >
        <PieChart>
          <ChartTooltip
            cursor={false}
            content={
              <ChartTooltipContent
                formatter={(_, name, item) => {
                  const { count, percentage } = item.payload
                  const rawPercent =
                    totalPercentage > 0 ? (Number(percentage) / totalPercentage) * 100 : 0
                  return `${name}: ${formatCurrencyVND(Number(count) || 0)} - ${formatNumber(rawPercent, { minimumFractionDigits: 0, maximumFractionDigits: 1 })}%`
                }}
              />
            }
          />
          <Pie
            data={segments as any}
            dataKey="percentage"
            nameKey="label"
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            label={renderLabel}
            labelLine={false}
            isAnimationActive={true}
          >
            {segments?.map((segment) => {
              const kebabLabel = toKebabCase(segment.label)
              return (
                <Cell
                  key={`cell-${kebabLabel}`}
                  name={segment.label}
                  fill={`var(--color-${kebabLabel})`}
                />
              )
            })}
          </Pie>

          <Label position="center" fill="#666">
            {formatCurrencyVND(total)}
          </Label>
          {!useCustomLegend && (
            <ChartLegend
              formatter={legendFormatter(compact)}
              iconSize={compact ? 10 : 20}
              iconType={'square'}
              layout={'horizontal'}
              verticalAlign={'bottom'}
              align={'center'}
              fontSize={compact ? '10' : '12'}
              wrapperStyle={compact ? { paddingTop: 4 } : undefined}
            />
          )}
        </PieChart>
      </ChartContainer>
      {useCustomLegend && (
        <div
          className={cn(
            'mt-4 flex flex-wrap items-center justify-center',
            compact ? 'gap-2' : 'gap-4'
          )}
        >
          {segments.map((segment, index) => {
            const color = getColorForLabelByIndex(index).backgroundColor
            return (
              <div key={segment.label} className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: color }} />
                <span className="typo-body-xs text-content-dark-2" title={segment.label}>
                  {segment.label}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default DoughnutChart
