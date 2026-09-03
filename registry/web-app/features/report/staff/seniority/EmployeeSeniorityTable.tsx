import { useLayoutEffect, useMemo, useRef } from 'react'
import type { ReactNode } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { Table } from '@/components/ui'
import type { EmployeeSeniority } from '@/services'
import { formatDate } from '@/utils/date-utils'
type EmployeeSeniorityRow = {
  id: number
  code: string
  fullname: string
  branchName: string
  blockName: string
  departmentName: string
  seniorityText: string
  workHistoryDisplay: ReactNode
}

type EmployeeSeniorityTableProps = {
  data?: EmployeeSeniority[]
  isLoading?: boolean
  enablePagination?: boolean
  pageSize?: number
  manualPagination?: boolean
  pageCount?: number
  totalRecords?: number
  currentPageIndex?: number
  onPaginationChange?: (pageIndex: number, pageSize: number) => void
}

const renderWorkHistory = (workHistory?: EmployeeSeniority['work_history']) => {
  if (!workHistory || workHistory.length === 0) {
    return '-'
  }

  return (
    <div className="flex flex-col gap-1">
      {workHistory.map((item, index) => {
        const range = `${formatDate(item.from_date)} - ${
          item.to_date ? formatDate(item.to_date) : 'Hiện tại'
        }`
        const detail = item.detail ? ` • ${item.detail}` : ''
        return (
          <span
            key={`${item.from_date}-${item.to_date || 'current'}-${index}`}
            className="typo-body-base-regular text-content-dark-1"
          >
            Lần {index + 1}: {range}
            {detail}
          </span>
        )
      })}
    </div>
  )
}

const EmployeeSeniorityTable = ({
  data = [],
  isLoading,
  enablePagination = false,
  pageSize,
  manualPagination = false,
  pageCount,
  totalRecords,
  currentPageIndex,
  onPaginationChange,
}: EmployeeSeniorityTableProps) => {
  const tableWrapperRef = useRef<HTMLDivElement | null>(null)

  const rows: EmployeeSeniorityRow[] = useMemo(() => {
    return data.map((item) => {
      const branchName = item.branch.name || '-'
      const blockName = item.block.name || '-'
      const departmentName = item.department.name || '-'

      return {
        id: item.id,
        code: item.code,
        fullname: item.fullname,
        branchName,
        blockName,
        departmentName,
        seniorityText: item.seniority_text ?? '-',
        workHistoryDisplay: renderWorkHistory(item.work_history),
      }
    })
  }, [data])

  const columns: ColumnDef<EmployeeSeniorityRow>[] = useMemo(
    () => [
      {
        accessorKey: 'code',
        header: 'Mã nhân viên',
        meta: {
          width: 'w-[180px]',
          frozen: true,
        },
      },
      {
        accessorKey: 'fullname',
        header: 'Tên nhân viên',
        meta: {
          width: 'w-[200px]',
          frozen: true,
        },
      },
      {
        accessorKey: 'branchName',
        header: 'Chi nhánh',
        meta: {
          width: 'w-[200px]',
        },
      },
      {
        accessorKey: 'blockName',
        header: 'Khối',
        meta: {
          width: 'w-[200px]',
        },
      },
      {
        accessorKey: 'departmentName',
        header: 'Phòng ban',
        meta: {
          width: 'w-[220px]',
        },
      },
      {
        accessorKey: 'seniorityText',
        header: 'Thâm niên',
        meta: {
          width: 'w-[220px]',
        },
      },
      {
        accessorKey: 'workHistoryDisplay',
        header: 'Quá trình làm việc',
        cell: ({ getValue }) => getValue(),
        meta: {
          width: 'w-[360px]',
        },
      },
    ],
    []
  )

  // Sticky header logic - scoped to this table instance
  useLayoutEffect(() => {
    const tableRoot = tableWrapperRef.current
    if (!tableRoot) return

    const table = tableRoot.querySelector('table') as HTMLElement | null
    if (!table) return

    const scrollContainer = table.closest(
      '[class*="overflow-x-auto"][class*="overflow-y-auto"]'
    ) as HTMLElement | null
    if (!scrollContainer) return

    const thead = table.querySelector('thead') as HTMLElement | null
    if (!thead) return

    const navBar = document.querySelector('[data-name="Header"]') as HTMLElement | null
    if (!navBar) return

    let frameId: number | null = null
    let lastTranslateOffset = -1

    const applyStickyTop = () => {
      frameId = null
      const navBarBottom = Math.round(navBar.getBoundingClientRect().bottom)
      const scrollContainerTop = Math.round(scrollContainer.getBoundingClientRect().top)
      const nextTranslateOffset =
        scrollContainerTop < navBarBottom ? Math.max(0, navBarBottom - scrollContainerTop) : 0
      if (nextTranslateOffset === lastTranslateOffset) return
      lastTranslateOffset = nextTranslateOffset
      thead.style.transform =
        nextTranslateOffset > 0 ? `translateY(${nextTranslateOffset}px)` : 'translateY(0px)'
    }

    const requestStickyTopUpdate = () => {
      if (frameId !== null) return
      frameId = window.requestAnimationFrame(applyStickyTop)
    }

    requestStickyTopUpdate()
    thead.style.willChange = 'transform'
    window.addEventListener('resize', requestStickyTopUpdate)
    window.addEventListener('scroll', requestStickyTopUpdate, { passive: true })
    scrollContainer.addEventListener('scroll', requestStickyTopUpdate, { passive: true })

    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId)
      }
      window.removeEventListener('resize', requestStickyTopUpdate)
      window.removeEventListener('scroll', requestStickyTopUpdate)
      scrollContainer.removeEventListener('scroll', requestStickyTopUpdate)
      thead.style.transform = 'translateY(0px)'
      thead.style.willChange = ''
    }
  }, [data])

  return (
    <div ref={tableWrapperRef}>
      <Table
        data={rows}
        columns={columns}
        enableSorting={false}
        showSTT
        sttFrozen
        className="px-10"
        isLoading={isLoading}
        emptyMessage="Không có dữ liệu thâm niên"
        enablePagination={enablePagination}
        pageSize={pageSize}
        manualPagination={manualPagination}
        pageCount={pageCount}
        totalRecords={totalRecords}
        currentPageIndex={currentPageIndex}
        onPaginationChange={onPaginationChange}
        disableInnerOverflow={true}
        paginationPosition="static"
      />
    </div>
  )
}

export default EmployeeSeniorityTable
