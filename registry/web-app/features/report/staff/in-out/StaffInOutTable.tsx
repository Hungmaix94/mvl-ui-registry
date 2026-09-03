import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { cn } from '@/utils'
import { IconCaretdown, IconCaretright } from '@/assets/icons'
import type {
  StaffInOutMetric,
  StaffInOutNode,
  StaffInOutReportAggregated,
} from '@/features/report/services/hrm-report-service'

// Display labels for the metric keys returned by the staff-in-out endpoint.
// Order always follows the server-provided `metric_keys`.
const METRIC_LABELS: Record<string, string> = {
  opening: 'Đầu kỳ',
  opening_male: 'Đầu kỳ (Nam)',
  opening_female: 'Đầu kỳ (Nữ)',
  hunt: 'Hunt',
  referral: 'Giới thiệu',
  total_new: 'Tổng vào',
  returns: 'Quay lại',
  transfers_net: 'Điều chuyển',
  resignations: 'Nghỉ việc',
  current: 'Cuối kỳ',
  current_male: 'Cuối kỳ (Nam)',
  current_female: 'Cuối kỳ (Nữ)',
}

const UNIT_COL_MIN_WIDTH = 260
const UNIT_COL_MAX_WIDTH = 520
// Approximate character width at typo-body-base (14px) used to fit the longest unit name
const UNIT_NAME_CHAR_WIDTH = 7.5
// Caret toggle + gap + horizontal paddings around the unit name
const UNIT_COL_EXTRA_SPACE = 56
const LEVEL_INDENT = 20
const METRIC_COL_WIDTH = 96
// System-wide summary columns flanking the period groups
const SUMMARY_COL_WIDTH = 150
const SUMMARY_OPENING_LABEL = 'Tổng số đầu kỳ theo hệ thống'
const SUMMARY_CURRENT_LABEL = 'Tổng số hiện tại theo hệ thống'
const ROW_HEIGHT = 44
const PERIOD_ROW_HEIGHT = 36
const METRIC_ROW_HEIGHT = 32
const HEADER_HEIGHT = PERIOD_ROW_HEIGHT + METRIC_ROW_HEIGHT
// Leave room for the fixed bottom HorizontalScrollBar strip rendered by the page (py-2 + h-2 = 24px)
const BOTTOM_BAR_SPACE = 26
const MIN_VIEWPORT_HEIGHT = 240

type FlattenedRow = {
  id: string
  name: string
  type: string
  level: number
  parentIds: string[]
  hasChildren: boolean
  statistics: StaffInOutMetric[]
}

function flattenNodes(
  nodes: StaffInOutNode[],
  level = 0,
  parentIds: string[] = []
): FlattenedRow[] {
  return nodes.flatMap((node, index) => {
    const id = `${parentIds[parentIds.length - 1] ?? ''}/${level}-${index}-${node.name}`
    const children = (node.children as unknown as StaffInOutNode[] | undefined) || []
    const row: FlattenedRow = {
      id,
      name: node.name,
      type: node.type,
      level,
      parentIds,
      hasChildren: children.length > 0,
      statistics: node.statistics || [],
    }
    return [row, ...flattenNodes(children, level + 1, [...parentIds, id])]
  })
}

const ROW_TYPE_TEXT_CLASS: Record<string, string> = {
  branch: 'typo-body-base-semibold text-content-dark-1',
  block: 'typo-body-base-medium text-content-dark-1',
  department: 'typo-body-base-regular text-content-dark-2',
  total: 'typo-body-base-semibold text-content-dark-1',
}

// Sticky/filler cells need their own solid background — row backgrounds don't stick
const ROW_TYPE_BG_CLASS: Record<string, string> = {
  branch: 'bg-background-2',
  block: 'bg-content-light-1',
  department: 'bg-content-light-1',
  // System-wide "Tổng" row — a distinct shade so it reads as the grand total.
  total: 'bg-background-3',
}

const CELL_BORDER_CLASS = 'border-border-1 border-r border-b border-solid'

type StaffInOutTableProps = {
  data?: StaffInOutReportAggregated
  /** Receives the internal scroll element so the page can sync its fixed HorizontalScrollBar */
  scrollContainerRef?: RefObject<HTMLDivElement | null>
}

const StaffInOutTable = ({ data, scrollContainerRef }: StaffInOutTableProps) => {
  const periodHeaders = data?.period_headers || []
  const metricKeys = data?.metric_keys || []

  const wrapperRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const [viewportHeight, setViewportHeight] = useState(MIN_VIEWPORT_HEIGHT)

  const setScrollNode = useCallback(
    (node: HTMLDivElement | null) => {
      scrollRef.current = node
      if (scrollContainerRef) {
        scrollContainerRef.current = node
      }
    },
    [scrollContainerRef]
  )

  // Pin the scroll container to a definite pixel height so the virtualizer
  // always sees a real viewport (same approach as VirtualTreeTable)
  useLayoutEffect(() => {
    const node = wrapperRef.current
    if (!node) return

    const measure = () => {
      const top = node.getBoundingClientRect().top
      setViewportHeight(
        Math.max(MIN_VIEWPORT_HEIGHT, (window.innerHeight - top - BOTTOM_BAR_SPACE) * 2)
      )
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    if (node.parentElement) observer.observe(node.parentElement)
    window.addEventListener('resize', measure)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [])

  // Pin the system-wide "Tổng" node (type 'total') to the very top, above every branch.
  // Sort is stable in V8 so the remaining branches keep their backend order.
  const rows = useMemo(() => {
    const topLevel = [...(data?.data || [])].sort(
      (a, b) => Number(b.type === 'total') - Number(a.type === 'total')
    )
    return flattenNodes(topLevel)
  }, [data?.data])

  // Expand/collapse state - all nodes expanded by default
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set())

  const handleToggleRow = useCallback((rowId: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev)
      if (next.has(rowId)) {
        next.delete(rowId)
      } else {
        next.add(rowId)
      }
      return next
    })
  }, [])

  // Hide rows whose ancestor is collapsed
  const visibleRows = useMemo(
    () => rows.filter((row) => !row.parentIds.some((parentId) => collapsedIds.has(parentId))),
    [rows, collapsedIds]
  )

  // Size the unit column to fit the longest (indented) name so names never truncate
  const unitColWidth = useMemo(() => {
    const maxContentWidth = rows.reduce(
      (max, row) =>
        Math.max(max, row.name.length * UNIT_NAME_CHAR_WIDTH + row.level * LEVEL_INDENT),
      0
    )
    return Math.min(
      UNIT_COL_MAX_WIDTH,
      Math.max(UNIT_COL_MIN_WIDTH, Math.ceil(maxContentWidth) + UNIT_COL_EXTRA_SPACE)
    )
  }, [rows])

  const metricColumnCount = periodHeaders.length * metricKeys.length
  const totalWidth = unitColWidth + SUMMARY_COL_WIDTH * 2 + metricColumnCount * METRIC_COL_WIDTH

  const rowVirtualizer = useVirtualizer({
    count: visibleRows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 12,
  })

  const virtualRows = rowVirtualizer.getVirtualItems()

  if (!rows.length) {
    return (
      <div className="text-content-dark-3 typo-body-base-regular py-8 text-center">
        Không có dữ liệu báo cáo
      </div>
    )
  }

  const unitCellStickyStyle: CSSProperties = {
    width: unitColWidth,
    flex: '0 0 auto',
    position: 'sticky',
    left: 0,
  }

  return (
    <div ref={wrapperRef} className="border-border-1 min-h-0 border-t border-l border-solid">
      {/* scrollbar-hide-x: the page's fixed HorizontalScrollBar is the only horizontal
          scrollbar; the native vertical scrollbar stays visible */}
      <div
        ref={setScrollNode}
        className="scrollbar-hide-x overflow-auto"
        style={{ height: viewportHeight }}
      >
        <div className="relative" style={{ width: '100%', minWidth: totalWidth }}>
          {/* Header - 2 tiers: period buckets on top, metric labels below */}
          <div className="sticky top-0 z-30 flex" style={{ height: HEADER_HEIGHT }}>
            <div
              style={{ ...unitCellStickyStyle, zIndex: 31 }}
              className={cn(
                CELL_BORDER_CLASS,
                'bg-background-2 typo-body-base-semibold text-content-dark-1 flex items-center px-3'
              )}
            >
              Đơn vị
            </div>
            <div
              style={{ width: SUMMARY_COL_WIDTH, flex: '0 0 auto' }}
              className={cn(
                CELL_BORDER_CLASS,
                'bg-background-2 typo-body-sm-medium text-content-dark-1 flex items-center justify-center px-2 text-center'
              )}
            >
              {SUMMARY_OPENING_LABEL}
            </div>
            <div
              style={{ width: SUMMARY_COL_WIDTH, flex: '0 0 auto' }}
              className={cn(
                CELL_BORDER_CLASS,
                'bg-background-2 typo-body-sm-medium text-content-dark-1 flex items-center justify-center px-2 text-center'
              )}
            >
              {SUMMARY_CURRENT_LABEL}
            </div>
            <div className="flex flex-col" style={{ flex: '0 0 auto' }}>
              <div className="flex" style={{ height: PERIOD_ROW_HEIGHT }}>
                {periodHeaders.map((header) => (
                  <div
                    key={header}
                    style={{ width: metricKeys.length * METRIC_COL_WIDTH, flex: '0 0 auto' }}
                    className={cn(
                      CELL_BORDER_CLASS,
                      'bg-background-2 typo-body-base-semibold text-content-dark-1 flex items-center justify-center whitespace-nowrap'
                    )}
                  >
                    {header}
                  </div>
                ))}
              </div>
              <div className="flex" style={{ height: METRIC_ROW_HEIGHT }}>
                {periodHeaders.map((header) =>
                  metricKeys.map((key) => (
                    <div
                      key={`${header}-${key}`}
                      style={{ width: METRIC_COL_WIDTH, flex: '0 0 auto' }}
                      className={cn(
                        CELL_BORDER_CLASS,
                        'bg-background-2 typo-body-sm-medium text-content-dark-2 flex items-center justify-center whitespace-nowrap'
                      )}
                    >
                      {METRIC_LABELS[key] ?? key}
                    </div>
                  ))
                )}
              </div>
            </div>
            {/* Filler stretches the header across leftover space on wide viewports */}
            <div className="bg-background-2 border-border-1 flex-1 border-b border-solid" />
          </div>

          {/* Body - virtualized rows */}
          <div style={{ height: rowVirtualizer.getTotalSize() }} className="relative">
            {virtualRows.map((vRow) => {
              const row = visibleRows[vRow.index]
              const rowBgClass = ROW_TYPE_BG_CLASS[row.type] ?? ROW_TYPE_BG_CLASS.department
              const rowTextClass = ROW_TYPE_TEXT_CLASS[row.type] ?? ROW_TYPE_TEXT_CLASS.department
              const isCollapsed = collapsedIds.has(row.id)

              return (
                <div
                  key={row.id}
                  style={{
                    position: 'absolute',
                    top: vRow.start,
                    left: 0,
                    right: 0,
                    height: vRow.size,
                  }}
                  className={cn('flex', rowTextClass)}
                >
                  <div
                    style={{
                      ...unitCellStickyStyle,
                      zIndex: 10,
                      paddingLeft: `${12 + row.level * LEVEL_INDENT}px`,
                    }}
                    className={cn(
                      CELL_BORDER_CLASS,
                      rowBgClass,
                      'flex items-center gap-1 pr-3 whitespace-nowrap'
                    )}
                    title={row.name}
                  >
                    {row.hasChildren ? (
                      <button
                        type="button"
                        className="text-content-dark-3 hover:text-content-dark-1 flex shrink-0 cursor-pointer items-center border-none bg-transparent p-0"
                        onClick={() => handleToggleRow(row.id)}
                        aria-expanded={!isCollapsed}
                        aria-label={isCollapsed ? `Mở rộng ${row.name}` : `Thu gọn ${row.name}`}
                      >
                        {isCollapsed ? <IconCaretright size={14} /> : <IconCaretdown size={14} />}
                      </button>
                    ) : (
                      <span className="w-[14px] shrink-0" />
                    )}
                    <span>{row.name}</span>
                  </div>
                  <div
                    style={{ width: SUMMARY_COL_WIDTH, flex: '0 0 auto' }}
                    className={cn(
                      CELL_BORDER_CLASS,
                      rowBgClass,
                      'flex items-center justify-center'
                    )}
                  >
                    {row.statistics[0]?.opening ?? 0}
                  </div>
                  <div
                    style={{ width: SUMMARY_COL_WIDTH, flex: '0 0 auto' }}
                    className={cn(
                      CELL_BORDER_CLASS,
                      rowBgClass,
                      'flex items-center justify-center'
                    )}
                  >
                    {row.statistics[row.statistics.length - 1]?.current ?? 0}
                  </div>
                  {periodHeaders.map((header, periodIndex) => {
                    const metric = row.statistics[periodIndex] as
                      | Record<string, number | undefined>
                      | undefined
                    return metricKeys.map((key) => (
                      <div
                        key={`${row.id}-${header}-${key}`}
                        style={{ width: METRIC_COL_WIDTH, flex: '0 0 auto' }}
                        className={cn(
                          CELL_BORDER_CLASS,
                          rowBgClass,
                          'flex items-center justify-center'
                        )}
                      >
                        {metric?.[key] ?? 0}
                      </div>
                    ))
                  })}
                  {/* Filler keeps rows visually flush with the header on wide viewports */}
                  <div className={cn(rowBgClass, 'border-border-1 flex-1 border-b border-solid')} />
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export default StaffInOutTable
