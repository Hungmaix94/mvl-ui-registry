import { Bar, BarChart as RechartsBarChart, CartesianGrid, XAxis, YAxis, Cell } from 'recharts'
import { getColorForLabelByIndex } from '../../ui/chart/utils'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '../chart'
import { toKebabCase } from '../../lib/utils'
import { formatCurrencyVND } from '@/utils/common.ts'

type BarChartProps = {
  data: {
    label: string
  }[]
  width?: number
  dataKeys?: string[]
  dataKey?: string
  yAxisLabel?: string
  isLoading?: boolean
  initialWidth?: number
  hideLegend?: boolean
}

const MIN_CATEGORY_WIDTH = 110
const MAX_LABEL_LENGTH = 22

const formatLabel = (label: string) => {
  if (!label) {
    return ''
  }

  const normalized = label.replace(/\s+-\s+/g, ' • ')

  if (normalized.length <= MAX_LABEL_LENGTH) {
    return normalized
  }

  const truncated = normalized.slice(0, MAX_LABEL_LENGTH)
  const lastSpaceIndex = truncated.lastIndexOf(' ')

  if (lastSpaceIndex > 0) {
    return `${truncated.slice(0, lastSpaceIndex)}…`
  }

  return `${truncated.trimEnd()}…`
}

type XAxisTickProps = {
  x?: number
  y?: number
  payload?: {
    value?: string
  }
}

type DiagonalTickProps = XAxisTickProps & {
  shouldRotate: boolean
}

const DiagonalTick = ({ x = 0, y = 0, payload, shouldRotate }: DiagonalTickProps) => {
  const value = payload?.value ?? ''
  const formatted = formatLabel(value)

  return (
    <g transform={`translate(${x},${y})`}>
      <text
        transform={shouldRotate ? 'rotate(-32)' : undefined}
        textAnchor={shouldRotate ? 'end' : 'middle'}
        dominantBaseline={shouldRotate ? undefined : 'hanging'}
        dy={shouldRotate ? undefined : 8}
        fill="var(--color-content-dark-2)"
        fontSize={12}
      >
        <title>{value}</title>
        <tspan x="0">{formatted}</tspan>
      </text>
    </g>
  )
}

function CustomBarChart({
  data,
  dataKeys,
  dataKey,
  yAxisLabel,
  hideLegend = false,
}: BarChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState<number>(0)

  const chartConfig = useMemo(() => {
    const config: ChartConfig = {}
    if (dataKeys && data && data.length > 0) {
      const firstItem = data[0] as any
      const fieldLabels = firstItem?.field_labels || {}

      dataKeys.forEach((key, index) => {
        const kebabKey = toKebabCase(key)
        config[kebabKey] = {
          label: fieldLabels[key] || key,
          color: getColorForLabelByIndex(index).backgroundColor,
        }
      })
    }
    return config
  }, [dataKeys, data])

  const activeDataKeys = useMemo(() => {
    if (!dataKeys || !data) return []
    return dataKeys.filter(
      (key) =>
        key !== 'field_labels' && data.some((item) => item && (item as any)[key] !== undefined)
    )
  }, [data, dataKeys])

  const { transformedData, maxBars } = useMemo(() => {
    if (!data || !activeDataKeys) return { transformedData: [], maxBars: 0 }

    let max = 0
    const transformed = data.map((item) => {
      if (!item) return {}
      const newItem: any = { ...item }
      let index = 0
      activeDataKeys.forEach((key) => {
        const value = (item as any)[key]
        if (value && value !== 0) {
          newItem[`value${index}`] = value
          newItem[`key${index}`] = key
          index++
        }
      })
      max = Math.max(max, index)
      return newItem
    })

    return { transformedData: transformed, maxBars: max }
  }, [data, activeDataKeys])

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

  // Add wheel event listener for horizontal scrolling
  useEffect(() => {
    const element = scrollContainerRef.current
    if (!element) return

    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY === 0) return

      // If the content is scrollable (scrollWidth > clientWidth), translate vertical scroll to horizontal
      if (element.scrollWidth > element.clientWidth) {
        e.preventDefault()
        element.scrollLeft += e.deltaY
      }
    }

    element.addEventListener('wheel', handleWheel, { passive: false })

    return () => {
      element.removeEventListener('wheel', handleWheel)
    }
  }, [])

  const categoryCount = data?.length ?? 0
  const shouldRotate =
    categoryCount > 1 &&
    (containerWidth === 0 || categoryCount * MIN_CATEGORY_WIDTH > containerWidth)
  const xAxisHeight = shouldRotate ? 70 : 40
  const bottomMargin = shouldRotate ? 90 : 50
  const tickMargin = shouldRotate ? 12 : 6

  // Responsive gap configuration
  const barGap = 2
  const barCategoryGap = containerWidth < 768 ? 10 : containerWidth < 1024 ? 15 : 20

  const chartMargins = { left: 20, right: 30 }
  const availableWidth = containerWidth - chartMargins.left - chartMargins.right

  const barsPerCategory = maxBars || 1
  const MAX_BAR_WIDTH = 60
  const MIN_BAR_WIDTH = 32

  // Calculate minimum width required for scrolling
  const minCategoryWidth = barsPerCategory * MIN_BAR_WIDTH + (barsPerCategory - 1) * barGap + 40
  const minChartWidth = categoryCount * minCategoryWidth + chartMargins.left + chartMargins.right
  const isScrollable = containerWidth > 0 && minChartWidth > containerWidth

  // Calculate width for centering (when not scrolling)
  const maxCategoryWidth = barsPerCategory * MAX_BAR_WIDTH + (barsPerCategory - 1) * barGap + 60

  let xPadding = 0
  if (!isScrollable && categoryCount > 0 && containerWidth > 0) {
    const requiredWidth = categoryCount * maxCategoryWidth
    if (requiredWidth < availableWidth) {
      xPadding = (availableWidth - requiredWidth) / 2
    }
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <div
        ref={scrollContainerRef}
        className={`relative w-full ${isScrollable ? 'overflow-x-auto' : ''}`}
      >
        <div style={{ width: isScrollable ? `${minChartWidth}px` : '100%' }}>
          <ChartContainer
            config={chartConfig}
            className="h-[500px] w-full"
            initialDimension={{ width: containerWidth, height: 500 }}
          >
            <RechartsBarChart
              data={transformedData}
              dataKey={dataKey}
              margin={{
                top: 40,
                right: 30,
                left: 20,
                bottom: bottomMargin,
              }}
              barGap={barGap}
              barCategoryGap={barCategoryGap}
              maxBarSize={MAX_BAR_WIDTH}
              width={'100%'}
              height={450}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                strokeDasharray="3 3"
                height={xAxisHeight}
                interval={0}
                tickMargin={tickMargin}
                tickLine={false}
                padding={{ left: xPadding, right: xPadding }}
                tick={(tickProps) => <DiagonalTick {...tickProps} shouldRotate={shouldRotate} />}
              />
              <YAxis
                strokeDasharray="3 3"
                tickFormatter={(value) => formatCurrencyVND(value)}
                label={
                  yAxisLabel
                    ? {
                        value: yAxisLabel,
                        position: 'top',
                        dy: -20,
                      }
                    : {}
                }
              />
              <ChartTooltip
                cursor={{ fill: '#f2f2f28A' }}
                content={({ active, payload, label }) => {
                  if (!active || !payload || !payload.length) return null

                  const originalData = payload[0].payload
                  const customPayload = activeDataKeys
                    .filter((key) => originalData[key] !== undefined && originalData[key] !== null)
                    .map((key) => {
                      const kebabKey = toKebabCase(key)
                      const config = chartConfig[kebabKey]
                      const rawValue = originalData[key]
                      return {
                        dataKey: key,
                        name: config?.label || key,
                        value: typeof rawValue === 'number' ? rawValue.toLocaleString() : rawValue,
                        color: config?.color,
                        payload: originalData,
                      }
                    })

                  if (!customPayload.length) return null

                  return (
                    <ChartTooltipContent active={active} payload={customPayload} label={label} />
                  )
                }}
              />

              {Array.from({ length: maxBars }).map((_, index) => (
                <Bar key={`bar-${index}`} dataKey={`value${index}`} isAnimationActive={false}>
                  {transformedData.map((entry, entryIndex) => {
                    const originalKey = entry[`key${index}`]
                    const kebabKey = originalKey ? toKebabCase(originalKey) : ''
                    return (
                      <Cell
                        key={`cell-${entryIndex}`}
                        fill={originalKey ? `var(--color-${kebabKey})` : 'transparent'}
                      />
                    )
                  })}
                </Bar>
              ))}
            </RechartsBarChart>
          </ChartContainer>
        </div>
      </div>
      {!hideLegend && (
        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          {activeDataKeys.map((key) => {
            const kebabKey = toKebabCase(key)
            const config = chartConfig[kebabKey]
            if (!config) return null
            return (
              <div key={key} className="flex items-center gap-2">
                <div className="h-5 w-5 rounded-sm" style={{ backgroundColor: config.color }} />
                <span className="text-content-dark-1 text-sm">{config.label}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default CustomBarChart
