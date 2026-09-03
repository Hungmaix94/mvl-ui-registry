import { useMemo, useEffect, useRef, useCallback, useLayoutEffect } from 'react'
import { Avatar as RadixAvatar, Flex, Text } from '@radix-ui/themes'
import {
  getDaysInMonth,
  getTimesheetEntryForDate,
} from '@/features/attendance/timesheet/_shares/utils/timesheet-utils'
import TimesheetDayCell from './TimesheetDayCell'
import TimesheetDayHeader from './TimesheetDayHeader'
import { EmployeeTimesheet, File } from '@/services'
import { cn } from '@/utils'
import UserAvatar from '@/components/ui/avatar/DefaultAvatar.tsx'

type TimesheetTableProps = {
  data: EmployeeTimesheet[]
  month: Date
  hideDays: boolean
  onSelectEntry?: (entryId: number, date: string) => void
  searchQuery?: string
}
export default function TimesheetTable({
  data,
  month,
  hideDays,
  onSelectEntry,
}: TimesheetTableProps) {
  const daysInMonth = useMemo(() => getDaysInMonth(month), [month])
  const theadRef = useRef<HTMLTableSectionElement>(null)
  const tableRef = useRef<HTMLTableElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const dragStateRef = useRef<{
    isActive: boolean
    startX: number
    startScrollLeft: number
    hasMoved: boolean
    clickedElement: HTMLElement | null
  } | null>(null)

  // Get scroll container
  const getScrollContainer = useCallback(() => {
    if (!tableRef.current) return null
    return tableRef.current.closest('[class*="overflow"]') as HTMLElement
  }, [])

  // Drag to scroll handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Only handle left mouse button
      if (e.button !== 0) return

      const scrollContainer = getScrollContainer()
      if (!scrollContainer) return

      const target = e.target as HTMLElement
      const clickedElement = target.closest('[role="button"][data-entry-id]') || target

      // Initialize drag state - allow drag to start from anywhere, including clickable cells
      // We'll only prevent click if user actually drags (moves > threshold)
      dragStateRef.current = {
        isActive: true,
        startX: e.clientX,
        startScrollLeft: scrollContainer.scrollLeft,
        hasMoved: false,
        clickedElement: clickedElement as HTMLElement,
      }

      // Don't prevent default here - let click events proceed normally if no drag occurs
    },
    [getScrollContainer]
  )

  // Global mouse move and up handlers for drag scrolling
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragStateRef.current?.isActive) return

      const scrollContainer = getScrollContainer()
      if (!scrollContainer) return

      const deltaX = e.clientX - dragStateRef.current.startX
      const DRAG_THRESHOLD = 5 // pixels to move before considering it a drag

      // Only start scrolling if moved beyond threshold
      if (Math.abs(deltaX) > DRAG_THRESHOLD) {
        if (!dragStateRef.current.hasMoved) {
          dragStateRef.current.hasMoved = true
          // Update cursor and prevent text selection
          if (wrapperRef.current) {
            wrapperRef.current.style.cursor = 'grabbing'
            wrapperRef.current.style.userSelect = 'none'
          }
          // Prevent default behavior once we confirm it's a drag
          e.preventDefault()
        }

        // Calculate new scroll position
        const newScrollLeft = dragStateRef.current.startScrollLeft - deltaX

        // CRITICAL FIX: Clamp scroll position to valid range [0, maxScrollLeft]
        const maxScrollLeft = Math.max(0, scrollContainer.scrollWidth - scrollContainer.clientWidth)
        const clampedScrollLeft = Math.max(0, Math.min(maxScrollLeft, newScrollLeft))

        scrollContainer.scrollLeft = clampedScrollLeft
      }
    }

    const handleMouseUp = () => {
      if (!dragStateRef.current) return

      const wasDragging = dragStateRef.current.hasMoved
      const clickedElement = dragStateRef.current.clickedElement

      // Reset cursor and selection
      if (wrapperRef.current) {
        wrapperRef.current.style.cursor = ''
        wrapperRef.current.style.userSelect = ''
      }

      // If we actually dragged, prevent click events on the clicked element
      if (wasDragging) {
        // Prevent click event using capture phase
        const preventClick = (clickEvent: MouseEvent) => {
          // Only prevent if the click target is the same element or its children
          const target = clickEvent.target as HTMLElement
          if (clickedElement && (target === clickedElement || clickedElement.contains(target))) {
            clickEvent.preventDefault()
            clickEvent.stopImmediatePropagation()
          }
          window.removeEventListener('click', preventClick, true)
        }

        // Add listener in capture phase to catch click before it reaches handlers
        window.addEventListener('click', preventClick, true)

        // Remove listener after a short delay to ensure we catch the click
        setTimeout(() => {
          window.removeEventListener('click', preventClick, true)
        }, 100)
      }

      dragStateRef.current = null
    }

    // Always attach listeners, they check dragStateRef internally
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [getScrollContainer])

  useLayoutEffect(() => {
    if (theadRef.current && tableRef.current) {
      const thead = theadRef.current
      const table = tableRef.current
      const scrollContainer = table.closest('[class*="overflow"]') as HTMLElement
      const navBar = document.querySelector('[data-name="Header"]') as HTMLElement | null
      if (!scrollContainer || !navBar) return

      const fixedHost = document.createElement('div')
      fixedHost.className = cn('pointer-events-none fixed hidden overflow-hidden')
      const fixedTable = document.createElement('table')
      fixedTable.className = cn(
        'bg-background-2',
        'border-border-1 border-x-[1px] border-t-[1px] border-solid',
        'absolute border-collapse'
      )

      const fixedThead = thead.cloneNode(true) as HTMLTableSectionElement
      fixedTable.appendChild(fixedThead)
      fixedHost.appendChild(fixedTable)
      document.body.appendChild(fixedHost)

      let frameId: number | null = null

      const syncHeader = () => {
        frameId = null

        const navBarBottom = Math.round(navBar.getBoundingClientRect().bottom)
        const scrollContainerRect = scrollContainer.getBoundingClientRect()
        const tableRect = table.getBoundingClientRect()
        const theadRect = thead.getBoundingClientRect()
        const shouldStick =
          tableRect.top < navBarBottom && tableRect.bottom > navBarBottom + theadRect.height

        if (!shouldStick) {
          fixedHost.style.display = 'none'
          thead.style.visibility = ''
          return
        }

        const sourceCells = Array.from(thead.querySelectorAll('th'))
        const fixedCells = Array.from(fixedThead.querySelectorAll('th'))
        sourceCells.forEach((cell, index) => {
          const width = Math.round(cell.getBoundingClientRect().width)
          const fixedCell = fixedCells[index]
          if (!fixedCell) return
          fixedCell.style.width = `${width}px`
          fixedCell.style.minWidth = `${width}px`
          fixedCell.style.maxWidth = `${width}px`
        })

        fixedHost.style.display = 'block'
        fixedHost.style.top = `${navBarBottom}px`
        fixedHost.style.left = `${Math.round(scrollContainerRect.left)}px`
        fixedHost.style.width = `${Math.round(scrollContainerRect.width)}px`
        fixedHost.style.height = `${Math.round(theadRect.height)}px`
        fixedHost.style.zIndex = '45'

        fixedTable.style.display = 'table'
        fixedTable.style.top = '0px'
        fixedTable.style.left = `${Math.round(tableRect.left - scrollContainerRect.left)}px`
        fixedTable.style.width = `${Math.round(tableRect.width)}px`
        thead.style.visibility = 'hidden'
      }

      const requestSyncHeader = () => {
        if (frameId !== null) return
        frameId = window.requestAnimationFrame(syncHeader)
      }

      const resizeObserver = new ResizeObserver(() => {
        requestSyncHeader()
      })
      resizeObserver.observe(scrollContainer)
      resizeObserver.observe(table)

      requestSyncHeader()
      window.addEventListener('scroll', requestSyncHeader, { passive: true })
      window.addEventListener('resize', requestSyncHeader)
      scrollContainer.addEventListener('scroll', requestSyncHeader, { passive: true })

      return () => {
        resizeObserver.disconnect()
        if (frameId !== null) {
          window.cancelAnimationFrame(frameId)
        }
        window.removeEventListener('scroll', requestSyncHeader)
        window.removeEventListener('resize', requestSyncHeader)
        scrollContainer.removeEventListener('scroll', requestSyncHeader)
        thead.style.visibility = ''
        fixedHost.remove()
      }
    }
  }, [data, month, hideDays])

  const summaryColumnsBeforeOT = [
    {
      key: 'probation_days',
      label: 'Công TV',
      meta: { className: 'min-w-[120px]' },
    },
    {
      key: 'official_work_days',
      label: 'Công CT',
      meta: { className: 'min-w-[120px]' },
    },
    {
      key: 'total_work_days',
      label: 'Tổng công',
      meta: { className: 'min-w-[120px]' },
    },
  ]

  const overtimeColumns = [
    {
      key: 'tc1_overtime_hours',
      label: 'Thứ 7 và trong tuần',
      meta: { className: 'min-w-[170px]' },
    },
    {
      key: 'tc2_overtime_hours',
      label: 'Chủ nhật',
      meta: { className: 'min-w-[120px]' },
    },
    {
      key: 'tc3_overtime_hours',
      label: 'Ngày lễ',
      meta: { className: 'min-w-[120px]' },
    },
  ]

  const summaryColumnsAfterOT = [
    {
      key: 'unexcused_absence_days',
      label: 'Nghỉ không lý do',
      meta: { className: 'min-w-[150px]' },
    },
    { key: 'holiday_days', label: 'Ngày lễ' },
    { key: 'unpaid_leave_days', label: 'Nghỉ KL', tooltip: 'Nghỉ không lương' },
    { key: 'maternity_leave_days', label: 'Nghỉ TS', tooltip: 'Nghỉ Thai sản' },
    { key: 'annual_leave_days', label: 'Nghỉ P', tooltip: 'Nghỉ phép' },
    {
      key: 'initial_leave_balance',
      label: 'Phép đầu kỳ',
      meta: { className: 'min-w-[150px]' },
    },
    { key: 'remaining_leave_balance', label: 'Phép tồn', tooltip: undefined },
  ]

  const summaryColumns = [...summaryColumnsBeforeOT, ...overtimeColumns, ...summaryColumnsAfterOT]

  const getAvatarUrl = (avatar: File) => {
    if (!avatar) return undefined
    return avatar.file_path || undefined
  }

  return (
    <div ref={wrapperRef} className="w-full pr-0 pl-10" onMouseDown={handleMouseDown}>
      <table
        ref={tableRef}
        className={cn(
          'bg-background-1 w-full border-collapse',
          'border-border-1 border-x-[1px] border-t-[1px] border-solid',
          'mt-0'
        )}
      >
        <thead ref={theadRef} className={cn('bg-background-2 sticky top-0 z-40 pt-0')}>
          {/* First header row - with grouped OT header */}
          <tr className="border-border-1 bg-background-2 border-b">
            {/* Freeze column: Employee name */}
            <th
              rowSpan={2}
              className={cn(
                'sticky left-0 z-50',
                'bg-background-2',
                'min-w-[200px]',
                'text-left',
                'pt-0 pb-0',
                hideDays && 'py-4',
                'shadow-[2px_0_4px_rgba(0,0,0,0.1)]'
              )}
            >
              <Flex
                direction={'column'}
                className="typo-body-base text-content-dark-2 block px-4 py-2"
                justify={'center'}
                align={'start'}
              >
                <span>Mã nhân viên</span>
                <span>Họ và tên</span>
              </Flex>
            </th>

            {/* Dynamic day columns */}
            {!hideDays &&
              daysInMonth.map((date) => (
                <th
                  key={date.toISOString()}
                  rowSpan={2}
                  className="min-w-[120px] pt-0 pb-0 text-center"
                >
                  <TimesheetDayHeader date={date} />
                </th>
              ))}

            {/* Summary columns before OT */}
            {summaryColumnsBeforeOT.map((col) => (
              <th
                key={col.key}
                rowSpan={2}
                className={cn('min-w-[100px]', 'text-center', 'pt-0', 'pb-2', col?.meta?.className)}
              >
                <span className="text-content-dark-2 typo-body-base">{col.label}</span>
              </th>
            ))}

            {/* Overtime group header */}
            <th
              colSpan={3}
              className={cn(
                'min-w-[100px]',
                'text-center',
                'pt-3',
                'pb-2',
                'px-4',
                'border-border-1 border-r-2 border-b border-l-2',
                'bg-background-2'
              )}
            >
              <span className="text-content-dark-2 typo-body-base-semibold">
                Thời gian làm ngoài giờ
              </span>
            </th>

            {/* Summary columns after OT */}
            {summaryColumnsAfterOT.map((col) => (
              <th
                key={col.key}
                rowSpan={2}
                className={cn('min-w-[100px]', 'text-center', 'pt-0', 'pb-2', col?.meta?.className)}
                title={col.tooltip}
              >
                <span className="text-content-dark-2 typo-body-base">{col.label}</span>
              </th>
            ))}
          </tr>

          {/* Second header row - OT column details */}
          <tr className="border-border-1 bg-background-2 border-b">
            {overtimeColumns.map((col, index) => (
              <th
                key={col.key}
                className={cn(
                  'min-w-[100px]',
                  'text-center',
                  'pt-2',
                  'pb-3',
                  'px-4',
                  'border-border-1',
                  index === 0 && 'border-l-2',
                  index === overtimeColumns.length - 1 && 'border-r-2',
                  col?.meta?.className
                )}
              >
                <span className="text-content-dark-2 typo-body-base">{col.label}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((timesheet) => {
            const employee = timesheet.employee
            const avatarUrl = getAvatarUrl(employee.avatar)

            return (
              <tr
                key={employee.id}
                data-employee-id={employee.id}
                className="border-border-1 hover:bg-data-light-grey-hover group border-b"
              >
                {/* Freeze column: Employee name with avatar */}
                <td
                  className={cn(
                    'sticky left-0 z-20',
                    'bg-background-1',
                    'group-hover:bg-data-light-grey-hover',
                    'shadow-[2px_0_4px_rgba(0,0,0,0.1)]',
                    'box-border',
                    'px-4 py-3'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <RadixAvatar
                      size="2"
                      src={avatarUrl}
                      fallback={<UserAvatar />}
                      radius="full"
                      variant="soft"
                      className="shrink-0"
                    />
                    <Flex direction={'column'} justify={'center'} align={'start'}>
                      <Text
                        className="text-content-dark-1 typo-body-base"
                        title={`Mã: ${employee.code || '-'}\nTên: ${employee.fullname || '-'}`}
                      >
                        {`${employee.code || '-'} - ${employee.fullname || '-'}`}
                      </Text>
                      <Text
                        className={'text-content-dark-3 typo-body-sm-medium max-w-[300px] truncate'}
                        title={`${employee?.branch?.name} - ${employee?.block?.name} - ${employee?.department?.name}`}
                      >
                        {`${employee?.branch?.name} - `}
                        {`${employee?.block?.name} - `}
                        {employee?.department?.name}
                      </Text>
                    </Flex>
                  </div>
                </td>

                {/* Dynamic day cells */}
                {!hideDays &&
                  daysInMonth.map((date, index) => {
                    const entry = getTimesheetEntryForDate(timesheet.dates, index)
                    return (
                      <td
                        key={`${date.toISOString()}-${index}`}
                        className={cn('p-0.5 text-center')}
                      >
                        <TimesheetDayCell entry={entry} onSelect={onSelectEntry} />
                      </td>
                    )
                  })}

                {/* Summary cells */}
                {summaryColumns.map((col) => {
                  const rawValue = timesheet[col.key as keyof typeof timesheet]
                  // Handle both string and number types from API
                  const value =
                    typeof rawValue === 'number'
                      ? rawValue
                      : typeof rawValue === 'string'
                        ? parseFloat(rawValue)
                        : undefined

                  // Check if this is an overtime column
                  const isOvertimeColumn = overtimeColumns.some((otCol) => otCol.key === col.key)
                  const overtimeIndex = overtimeColumns.findIndex((otCol) => otCol.key === col.key)

                  return (
                    <td
                      key={col.key}
                      className={cn(
                        'px-4 py-3 text-center',
                        isOvertimeColumn && 'border-border-1',
                        isOvertimeColumn && overtimeIndex === 0 && 'border-l-2',
                        isOvertimeColumn &&
                          overtimeIndex === overtimeColumns.length - 1 &&
                          'border-r-2',
                        isOvertimeColumn && 'bg-background-2/30'
                      )}
                    >
                      <span className="text-content-dark-1 text-sm">
                        {value !== undefined && value !== null && !isNaN(value) ? value : '-'}
                      </span>
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
