import { useCallback, useMemo, useRef, useState, useEffect } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  LabelList,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { wrapTextToLines } from '../../ui/chart/utils/xAxisTickLayout'

export interface StackedBarDataItem {
  label: string
  [key: string]: string | number
}

export interface StackedBarSegment {
  dataKey: string
  name: string
  color: string
  showLabel?: boolean
}

export type RightYAxisConfig = {
  label: string
  dataKey: string
  domain?: [number, number]
}

export type LineSeriesConfig = {
  dataKey: string
  name: string
  color: string
  showDataLabel?: boolean
  formatDataLabel?: (value: number) => string
}

export interface StackedBarChartProps {
  data: StackedBarDataItem[]
  segments: StackedBarSegment[]
  yAxisLabel?: string
  height?: number
  showPercentage?: boolean
  getPercentage?: (item: StackedBarDataItem) => number
  renderCustomTooltip?: (active: boolean, payload: any) => React.ReactNode | null
  renderCustomLegend?: () => React.ReactNode
  barSize?: number
  maxBarSize?: number
  showTotalOnTop?: boolean
  getTotalValue?: (item: StackedBarDataItem) => number
  barCategoryGap?: string | number
  rightYAxis?: RightYAxisConfig
  lineSeries?: LineSeriesConfig
}

function StackedBarChart({
  data,
  segments,
  yAxisLabel,
  height = 500,
  showPercentage = false,
  getPercentage,
  renderCustomTooltip,
  renderCustomLegend,
  barSize,
  maxBarSize = 60,
  showTotalOnTop = false,
  getTotalValue,
  barCategoryGap,
  rightYAxis,
  lineSeries,
}: StackedBarChartProps) {
  const useDualAxis = Boolean(rightYAxis && lineSeries)
  const chartMargin = useMemo(
    () => ({
      top: 40,
      right: useDualAxis ? 56 : 30,
      left: 20,
      bottom: 60,
    }),
    [useDualAxis]
  )
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState<number>(0)

  useEffect(() => {
    const element = containerRef.current
    if (!element) {
      return
    }

    const updateWidth = () => {
      setContainerWidth(element.getBoundingClientRect().width)
    }

    updateWidth()

    if (typeof ResizeObserver === 'function') {
      const observer = new ResizeObserver(() => {
        updateWidth()
      })
      observer.observe(element)

      return () => {
        observer.disconnect()
      }
    }

    window.addEventListener('resize', updateWidth)
    return () => {
      window.removeEventListener('resize', updateWidth)
    }
  }, [])

  const responsiveGap = containerWidth < 768 ? 10 : containerWidth < 1024 ? 15 : 20
  const finalBarCategoryGap = barCategoryGap ?? responsiveGap
  const gapValue = typeof finalBarCategoryGap === 'number' ? finalBarCategoryGap : 20
  const usedBarSize = barSize ?? maxBarSize
  const maxLabelWidth = usedBarSize + gapValue

  const renderXAxisTick = useCallback(
    (props: { x?: number; y?: number; payload?: { value?: string | number } }) => {
      const x = props.x ?? 0
      const y = props.y ?? 0
      const value = props.payload?.value ?? ''
      if (value == null || value === '') return null

      const lines = wrapTextToLines(String(value), maxLabelWidth)
      const lineHeight = 14

      return (
        <g transform={`translate(${x},${y})`}>
          <text
            x={0}
            y={0}
            dy={lineHeight}
            fill="var(--color-content-dark-3)"
            textAnchor="middle"
            fontSize={12}
            className="typo-body-xs-regular"
          >
            {lines.map((line, i) => (
              <tspan key={i} x={0} dy={i === 0 ? 0 : lineHeight} textAnchor="middle">
                {line}
              </tspan>
            ))}
          </text>
        </g>
      )
    },
    [maxLabelWidth]
  )

  // Calculate padding to center bars if there are few items
  let xPadding = 0
  if (containerWidth > 0 && data.length > 0) {
    const chartMargins = { left: 80, right: 80 }
    const availableWidth = containerWidth - chartMargins.left - chartMargins.right
    const requiredWidth = data.length * (usedBarSize + gapValue)
    if (requiredWidth < availableWidth) {
      xPadding = (availableWidth - requiredWidth) / 2
    }
  }

  const renderLabel = (props: any) => {
    const { x, y, width, height, value } = props

    // Only show label if bar has meaningful height and value
    if (height < 15 || !value || value === 0) return null

    return (
      <text
        x={x + width / 2}
        y={y + height / 2}
        fill="white"
        textAnchor="middle"
        dominantBaseline="middle"
        className="typo-body-xs-regular"
      >
        {value}
      </text>
    )
  }

  const renderPercentageLabel = (props: any) => {
    const { x, y, width, height, index, value } = props

    if (index === undefined || !data[index]) return null

    const dataItem = data[index]

    if (!dataItem || !showPercentage || !getPercentage) return null

    // Only show if bar has meaningful height
    if (height < 20 || !value || value === 0) return null

    const percentage = getPercentage(dataItem)

    return (
      <text
        x={x + width / 2}
        y={y + height / 2 + 20}
        fill="white"
        textAnchor="middle"
        dominantBaseline="middle"
        className="typo-body-xs-regular"
        key={`percentage-${index}`}
      >
        ({percentage}%)
      </text>
    )
  }

  const renderTotalLabel = (props: any) => {
    const { x, width, index } = props

    if (index === undefined || !data[index]) return null

    const dataItem = data[index]

    if (!dataItem || !showTotalOnTop || !getTotalValue) return null

    const total = getTotalValue(dataItem)

    if (total === 0) return null

    return (
      <text
        x={x + width / 2}
        y={props.y - 8}
        fill="var(--color-content-dark-3)"
        textAnchor="middle"
        className="typo-body-xs-regular"
        key={`total-${index}`}
      >
        {total}
      </text>
    )
  }

  const DefaultTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null

    const dataItem = payload[0].payload

    return (
      <div className="border-border-1 rounded-lg border bg-white p-3 shadow-lg">
        <p className="typo-body-sm-semibold text-content-dark-1 mb-2">{dataItem.label}</p>
        <div className="space-y-1">
          {segments.map((segment) => (
            <div key={segment.dataKey} className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: segment.color }} />
              <span className="typo-body-sm-regular text-content-dark-2">
                {segment.name}: {dataItem[segment.dataKey]}
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const DefaultLegend = () => {
    return (
      <div className="mt-4 flex items-center justify-center gap-6">
        {segments.map((segment) => (
          <div key={segment.dataKey} className="flex items-center gap-2">
            <div className="h-4 w-4 rounded-sm" style={{ backgroundColor: segment.color }} />
            <span className="typo-body-sm-regular text-content-dark-2">{segment.name}</span>
          </div>
        ))}
      </div>
    )
  }

  const TooltipComponent = useMemo(
    () =>
      renderCustomTooltip
        ? ({ active, payload }: any) => renderCustomTooltip(active, payload)
        : DefaultTooltip,
    [renderCustomTooltip]
  )

  const rightDomain = rightYAxis?.domain ?? [0, 100]
  const ChartWrapper = useDualAxis ? ComposedChart : BarChart

  return (
    <div className="h-full [&_*]:ring-0 [&_*]:outline-none" ref={containerRef}>
      <ResponsiveContainer width="100%" height={height}>
        <ChartWrapper
          data={data}
          margin={chartMargin}
          barSize={barSize}
          maxBarSize={maxBarSize}
          barCategoryGap={finalBarCategoryGap}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal vertical={false} />
          <XAxis
            dataKey="label"
            interval={0}
            tick={renderXAxisTick}
            tickLine={false}
            tickMargin={10}
            axisLine={{ stroke: 'var(--color-border-1)' }}
            padding={{ left: xPadding, right: xPadding }}
          />
          <YAxis
            yAxisId="left"
            tick={{ fill: 'var(--color-content-dark-3)', fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: 'var(--color-border-1)' }}
            label={
              yAxisLabel
                ? {
                    value: yAxisLabel,
                    angle: -90,
                    position: 'insideLeft',
                    style: {
                      fill: 'var(--color-content-dark-3)',
                      fontSize: 12,
                    },
                  }
                : undefined
            }
          />
          {useDualAxis && rightYAxis ? (
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={rightDomain}
              tick={{ fill: 'var(--color-content-dark-3)', fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: 'var(--color-border-1)' }}
              tickFormatter={(value) => `${value}%`}
              label={{
                value: rightYAxis.label,
                angle: 90,
                position: 'insideRight',
                style: { fill: 'var(--color-content-dark-3)', fontSize: 12 },
              }}
            />
          ) : null}
          <Tooltip content={<TooltipComponent />} cursor={{ fill: 'rgb(0, 0, 0, 0.05)' }} />

          {/* Stacked bars */}
          {segments.map((segment, index) => {
            const isFirst = index === 0
            const isLast = index === segments.length - 1
            return (
              <Bar
                key={segment.dataKey}
                dataKey={segment.dataKey}
                stackId="a"
                fill={segment.color}
                radius={isLast ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                yAxisId="left"
              >
                {segment.showLabel !== false && (
                  <LabelList content={renderLabel} position="inside" />
                )}
                {isFirst && showPercentage && (
                  <LabelList content={renderPercentageLabel} position="inside" />
                )}
                {isLast && showTotalOnTop && (
                  <LabelList content={renderTotalLabel} position="top" />
                )}
              </Bar>
            )
          })}
          {useDualAxis && lineSeries && (
            <Line
              type="monotone"
              dataKey={lineSeries.dataKey}
              name={lineSeries.name}
              stroke={lineSeries.color}
              strokeWidth={2}
              dot={{ r: 4 }}
              yAxisId="right"
            >
              {lineSeries.showDataLabel && (
                <LabelList
                  position="top"
                  offset={10}
                  content={(props: {
                    x?: number | string
                    y?: number | string
                    value?: unknown
                  }) => {
                    const x = Number(props.x ?? 0)
                    const y = Number(props.y ?? 0)
                    const { value } = props
                    const text = lineSeries.formatDataLabel
                      ? lineSeries.formatDataLabel(Number(value ?? 0))
                      : String(value ?? '')
                    if (!text) return null
                    return (
                      <text
                        x={x}
                        y={y}
                        dy={-10}
                        fill="var(--color-content-dark-2)"
                        fontSize={11}
                        textAnchor="middle"
                        className="typo-body-xs-regular"
                      >
                        {text}
                      </text>
                    )
                  }}
                />
              )}
            </Line>
          )}
        </ChartWrapper>
      </ResponsiveContainer>
      {renderCustomLegend ? renderCustomLegend() : <DefaultLegend />}
    </div>
  )
}

export default StackedBarChart
