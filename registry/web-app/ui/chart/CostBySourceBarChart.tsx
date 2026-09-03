import { Bar, ComposedChart, LabelList, Line, Rectangle, Tooltip, XAxis, YAxis } from 'recharts'
import { Fragment, useMemo } from 'react'
import { ChartConfig, ChartContainer } from '../../ui/chart'
import { formatCurrencyVND } from '@/utils/common'
import {
  getTickLines,
  getXAxisTickLayout,
  TICK_FONT_SIZE,
  TICK_LINE_HEIGHT,
  TICK_ROTATE_DEGREE,
  type XAxisTickLayout,
} from '../../ui/chart/utils/xAxisTickLayout'
import useMatchTriggerWidth from '../../hooks/useMatchTriggerWidth'

export type CostBySourceDataItem = {
  label: string
  averageCost?: number
  [key: string]: string | number | undefined
}

export type CostBySourceSegment = {
  dataKey: string
  expectedDataKey: string
  expectedRawDataKey?: string
  name: string
  color: string
}

const EXPECTED_ALPHA = 0.4
const EXPECTED_LEGEND_COLOR = 'rgba(120, 120, 120, 0.4)'
const BAR_TOP_RADIUS: [number, number, number, number] = [4, 4, 0, 0]
const BAR_NO_RADIUS: [number, number, number, number] = [0, 0, 0, 0]

/**
 * Convert a 6-digit hex color (`#RRGGBB`) to an `rgba()` string with the given alpha.
 * Returns the input unchanged if it is not a 6-digit hex (e.g. already an rgba/named color).
 * The chart palette in `getColorForLabelByIndex` only emits 6-digit hex, so this is safe here.
 */
function lightenColor(color: string, alpha = EXPECTED_ALPHA): string {
  const m = color.replace('#', '').match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i)
  if (!m) return color
  const r = parseInt(m[1], 16)
  const g = parseInt(m[2], 16)
  const b = parseInt(m[3], 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export type CostBySourceLineSeries = {
  dataKey: string
  name: string
  color: string
}

type CostBySourceBarChartProps = {
  data: CostBySourceDataItem[]
  segments: CostBySourceSegment[]
  lineSeries: CostBySourceLineSeries
  yAxisLabel?: string
  /** Right Y-axis label (for average cost line). Defaults to lineSeries.name */
  rightYAxisLabel?: string
  /**
   * When set, the paid (solid) and expected (light) parts are treated as two
   * distinctly named series instead of "(Thực tế)/(Dự kiến)" variants of one.
   * In this mode the tooltip/legend label the paid part with `segment.name` and the
   * expected part with this value, and the "expected" legend swatch matches the actual
   * expected bar color (`lightenColor(segment.color)`) instead of the neutral grey.
   * Leave undefined for multi-source charts where the suffix wording is required.
   */
  expectedSeriesLabel?: string
  height?: number
}

const formatTickVND = (value: number) => `${formatCurrencyVND(value)} ₫`

const MAX_BAR_SIZE = 60
/** Fixed bar width so grouped bars stay compact; gap between bars = barGap only */
const BAR_SIZE = 32
/** Width reserved for each Y axis; both axes take this out of the plotting area. */
const Y_AXIS_WIDTH = 52
const CHART_MARGIN_LEFT = 52
const CHART_MARGIN_RIGHT = 65
/** Bottom margin the chart was designed around; extra label rows grow the chart height. */
const BASE_BOTTOM_MARGIN = 60

function renderYAxisTick(
  props: { x?: number; y?: number; payload?: { value?: number } },
  isRight?: boolean
) {
  const { x = 0, y = 0, payload } = props
  const value = payload?.value
  if (value === undefined) return null
  const text = formatTickVND(value)
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        fill="var(--color-content-dark-3)"
        fontSize={12}
        textAnchor={isRight ? 'start' : 'end'}
        dominantBaseline="middle"
        className="typo-body-xs-regular"
      >
        <tspan x={0} dy={0}>
          {text}
        </tspan>
      </text>
    </g>
  )
}

type XAxisTickProps = {
  x?: number
  y?: number
  payload?: { value?: string | number }
}

/**
 * Category tick label. Every tick is rendered (`interval={0}`) so no branch/source name
 * can be silently dropped; `layout` decides whether it wraps or rotates to fit.
 */
function renderXAxisTick(props: XAxisTickProps, layout: XAxisTickLayout) {
  const { x = 0, y = 0, payload } = props
  const value = payload?.value
  if (value === undefined || value === null || value === '') return null

  const label = String(value)
  const lines = getTickLines(label, layout)

  return (
    <g transform={`translate(${x},${y})`}>
      <text
        transform={layout.shouldRotate ? `rotate(${TICK_ROTATE_DEGREE})` : undefined}
        textAnchor={layout.shouldRotate ? 'end' : 'middle'}
        dy={layout.shouldRotate ? 0 : TICK_LINE_HEIGHT}
        fill="var(--color-content-dark-3)"
        fontSize={TICK_FONT_SIZE}
        className="typo-body-xs-regular"
      >
        <title>{label}</title>
        {lines.map((line, index) => (
          <tspan key={`${line}-${index}`} x={0} dy={index === 0 ? 0 : TICK_LINE_HEIGHT}>
            {line}
          </tspan>
        ))}
      </text>
    </g>
  )
}

function CostBySourceBarChart({
  data,
  segments,
  lineSeries,
  yAxisLabel = 'Chi phí (₫)',
  rightYAxisLabel,
  expectedSeriesLabel,
  height = 500,
}: CostBySourceBarChartProps) {
  const rightLabel = rightYAxisLabel ?? lineSeries.name
  const chartConfig = useMemo<ChartConfig>(() => {
    const config: ChartConfig = {}
    segments.forEach((seg, i) => {
      config[`source-${i}`] = { label: seg.name, color: seg.color }
    })
    config['average-cost'] = { label: lineSeries.name, color: lineSeries.color }
    return config
  }, [segments, lineSeries])

  const leftDomain = useMemo(() => {
    let max = 0
    data.forEach((d) => {
      segments.forEach((seg) => {
        const v = Number(d[seg.dataKey] ?? 0) + Number(d[seg.expectedDataKey] ?? 0)
        if (v > max) max = v
      })
    })
    return [0, max > 0 ? Math.ceil(max * 1.1) : 100] as [number, number]
  }, [data, segments])

  const rightDomain = useMemo(() => {
    const values = data.map((d) => Number(d[lineSeries.dataKey] ?? 0))
    const max = Math.max(0, ...values)
    return [0, max > 0 ? Math.ceil(max * 1.1) : 100] as [number, number]
  }, [data, lineSeries.dataKey])

  /** Same relative tick positions for both axes so labels align horizontally */
  const tickCount = 5
  const leftTicks = useMemo(() => {
    const [, max] = leftDomain
    return Array.from({ length: tickCount }, (_, i) => (max * i) / (tickCount - 1))
  }, [leftDomain])
  const rightTicks = useMemo(() => {
    const [, max] = rightDomain
    return Array.from({ length: tickCount }, (_, i) => (max * i) / (tickCount - 1))
  }, [rightDomain])

  // The category labels must stay readable at any zoom level, so their layout is derived
  // from the measured plot width instead of assuming a fixed, roomy container.
  const { triggerRef: containerRef, width: containerWidth } = useMatchTriggerWidth<HTMLDivElement>()

  const tickLayout = useMemo(() => {
    const leftOffset = CHART_MARGIN_LEFT + Y_AXIS_WIDTH
    // `plotWidth <= 0` means "not measured yet" to the layout helper, so once the container
    // HAS been measured keep the width positive — a container narrower than the chart chrome
    // must still rotate its labels instead of stacking them on one overlapping line.
    const plotWidth =
      containerWidth === undefined
        ? 0
        : Math.max(1, containerWidth - leftOffset - CHART_MARGIN_RIGHT - Y_AXIS_WIDTH)
    return getXAxisTickLayout({
      labels: data.map((item) => item.label),
      plotWidth,
      leftOffset,
    })
  }, [containerWidth, data])

  // Grow the chart instead of the plot area so taller labels never squash the bars.
  const chartHeight =
    Math.max(300, height) + Math.max(0, tickLayout.bottomMargin - BASE_BOTTOM_MARGIN)

  return (
    <div className="relative w-full" ref={containerRef}>
      <ChartContainer config={chartConfig} className="w-full" style={{ height: chartHeight }}>
        <ComposedChart
          data={data}
          margin={{
            top: 40,
            right: CHART_MARGIN_RIGHT,
            left: CHART_MARGIN_LEFT + tickLayout.extraLeftMargin,
            bottom: tickLayout.bottomMargin,
          }}
          barCategoryGap={20}
          barGap={2}
          barSize={BAR_SIZE}
          maxBarSize={MAX_BAR_SIZE}
        >
          <XAxis
            dataKey="label"
            interval={0}
            tick={(tickProps) => renderXAxisTick(tickProps, tickLayout)}
            tickLine={false}
            axisLine={{ stroke: 'var(--color-border-1)' }}
            tickMargin={10}
          />
          <YAxis
            yAxisId="left"
            domain={leftDomain}
            ticks={leftTicks}
            tick={(p) => renderYAxisTick(p, false)}
            tickLine={false}
            axisLine={{ stroke: 'var(--color-border-1)' }}
            width={Y_AXIS_WIDTH}
            label={{
              value: yAxisLabel,
              angle: 90,
              position: 'insideRight',
              offset: -10,
              style: { fill: 'var(--color-content-dark-3)', fontSize: 12 },
            }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            domain={rightDomain}
            ticks={rightTicks}
            tick={(p) => renderYAxisTick(p, true)}
            tickLine={false}
            axisLine={{ stroke: 'var(--color-border-1)' }}
            width={Y_AXIS_WIDTH}
            label={{
              value: rightLabel,
              angle: 90,
              position: 'insideLeft',
              offset: -10,
              style: { fill: 'var(--color-content-dark-3)', fontSize: 12 },
            }}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const item = payload[0].payload as CostBySourceDataItem
              return (
                <div className="border-border-1 bg-background-1 rounded-lg border p-3 shadow-lg">
                  <p className="typo-body-sm-semibold text-content-dark-1 mb-2">{item.label}</p>
                  <div className="space-y-2">
                    {segments.map((seg) => (
                      <div key={seg.dataKey} className="space-y-1">
                        <div className="flex items-center gap-2">
                          <div
                            className="h-3 w-3 rounded-sm"
                            style={{ backgroundColor: seg.color }}
                          />
                          <span className="typo-body-sm-regular text-content-dark-2">
                            {expectedSeriesLabel ? seg.name : `${seg.name} (Thực tế)`}:{' '}
                            {formatTickVND(Number(item[seg.dataKey] ?? 0))}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div
                            className="h-3 w-3 rounded-sm"
                            style={{ backgroundColor: lightenColor(seg.color) }}
                          />
                          <span className="typo-body-sm-regular text-content-dark-2">
                            {expectedSeriesLabel ?? `${seg.name} (Dự kiến)`}:{' '}
                            {formatTickVND(
                              Number(item[seg.expectedRawDataKey ?? seg.expectedDataKey] ?? 0)
                            )}
                          </span>
                        </div>
                      </div>
                    ))}
                    <div className="border-border-1 mt-2 flex items-center gap-2 border-t pt-2">
                      <div
                        className="h-3 w-3 rounded-full border-2 border-current"
                        style={{ borderColor: lineSeries.color }}
                      />
                      <span className="typo-body-sm-semibold text-content-dark-1">
                        {lineSeries.name}: {formatTickVND(Number(item[lineSeries.dataKey] ?? 0))}
                      </span>
                    </div>
                  </div>
                </div>
              )
            }}
            cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
          />
          {segments.map((segment) => (
            <Fragment key={segment.dataKey}>
              <Bar
                dataKey={segment.dataKey}
                stackId={segment.dataKey}
                fill={segment.color}
                yAxisId="left"
                shape={(props: unknown) => {
                  const p = props as {
                    payload?: Record<string, unknown>
                  } & Record<string, unknown>
                  const gap = Number(p.payload?.[segment.expectedDataKey] ?? 0)
                  return (
                    <Rectangle
                      {...(p as object)}
                      radius={gap > 0 ? BAR_NO_RADIUS : BAR_TOP_RADIUS}
                    />
                  )
                }}
              />
              <Bar
                dataKey={segment.expectedDataKey}
                stackId={segment.dataKey}
                fill={lightenColor(segment.color)}
                radius={BAR_TOP_RADIUS}
                yAxisId="left"
              />
            </Fragment>
          ))}
          <Line
            type="monotone"
            dataKey={lineSeries.dataKey}
            name={lineSeries.name}
            stroke={lineSeries.color}
            strokeWidth={2}
            dot={{ r: 4 }}
            yAxisId="right"
            connectNulls
          >
            <LabelList
              position="top"
              offset={12}
              formatter={(label) => formatTickVND(Number(label ?? 0))}
            />
          </Line>
        </ComposedChart>
      </ChartContainer>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-6">
        {segments.map((seg) => (
          <div key={seg.dataKey} className="flex items-center gap-2">
            <div className="h-4 w-4 rounded-sm" style={{ backgroundColor: seg.color }} />
            <span className="typo-body-sm-regular text-content-dark-2">{seg.name}</span>
          </div>
        ))}
        <div className="flex items-center gap-2">
          <div
            className="h-4 w-4 rounded-sm"
            style={{
              backgroundColor: expectedSeriesLabel
                ? lightenColor(segments[0]?.color ?? '#787878')
                : EXPECTED_LEGEND_COLOR,
            }}
          />
          <span className="typo-body-sm-regular text-content-dark-2">
            {expectedSeriesLabel ?? 'Chi phí dự kiến'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-0.5 w-4 rounded-full" style={{ backgroundColor: lineSeries.color }} />
          <span className="typo-body-sm-regular text-content-dark-2">{lineSeries.name}</span>
        </div>
      </div>
    </div>
  )
}

export default CostBySourceBarChart
