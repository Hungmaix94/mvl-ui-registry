import { useLayoutEffect, useMemo, useRef } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { Table } from '@/components/ui'
import type { JobTransferReport } from '@/features/report/services/hrm-report-service'
import { formatDate } from '@/utils/date-utils'

type JobTransferReportRow = {
  id: number
  code: string
  fullname: string
  employeeType: string
  transferDate: string
  oldPosition: string
  oldDepartment: string
  oldBlock: string
  oldBranch: string
  newPosition: string
  newDepartment: string
  newBlock: string
  newBranch: string
  description: string
}

type JobTransferReportTableProps = {
  data?: JobTransferReport[]
  isLoading?: boolean
  enablePagination?: boolean
  pageSize?: number
  manualPagination?: boolean
  pageCount?: number
  totalRecords?: number
  currentPageIndex?: number
  onPaginationChange?: (pageIndex: number, pageSize: number) => void
}

const orgName = (org?: { name?: string } | null) => org?.name || '-'

const JobTransferReportTable = ({
  data = [],
  isLoading,
  enablePagination = false,
  pageSize,
  manualPagination = false,
  pageCount,
  totalRecords,
  currentPageIndex,
  onPaginationChange,
}: JobTransferReportTableProps) => {
  const tableWrapperRef = useRef<HTMLDivElement | null>(null)

  const rows: JobTransferReportRow[] = useMemo(() => {
    return data.map((item, index) => ({
      id: index,
      code: item.code || '-',
      fullname: item.fullname || '-',
      employeeType: item.employee_type_display || '-',
      transferDate: item.transfer_date ? formatDate(item.transfer_date) : '-',
      oldPosition: orgName(item.old_position),
      oldDepartment: orgName(item.old_department),
      oldBlock: orgName(item.old_block),
      oldBranch: orgName(item.old_branch),
      newPosition: orgName(item.new_position),
      newDepartment: orgName(item.new_department),
      newBlock: orgName(item.new_block),
      newBranch: orgName(item.new_branch),
      description: item.description || '-',
    }))
  }, [data])

  const columns: ColumnDef<JobTransferReportRow>[] = useMemo(
    () => [
      { accessorKey: 'code', header: 'Mã nhân viên', meta: { width: 'w-[160px]', frozen: true } },
      {
        accessorKey: 'fullname',
        header: 'Tên nhân viên',
        meta: { width: 'w-[200px]', frozen: true },
      },
      { accessorKey: 'employeeType', header: 'Loại nhân viên', meta: { width: 'w-[160px]' } },
      {
        accessorKey: 'transferDate',
        header: 'Chuyển phòng/ban từ ngày',
        meta: { width: 'w-[150px]' },
      },
      { accessorKey: 'oldPosition', header: 'Chức vụ cũ', meta: { width: 'w-[180px]' } },
      { accessorKey: 'oldDepartment', header: 'Phòng ban cũ', meta: { width: 'w-[180px]' } },
      { accessorKey: 'oldBlock', header: 'Khối cũ', meta: { width: 'w-[160px]' } },
      { accessorKey: 'oldBranch', header: 'Chi nhánh cũ', meta: { width: 'w-[180px]' } },
      { accessorKey: 'newPosition', header: 'Chức vụ mới', meta: { width: 'w-[180px]' } },
      { accessorKey: 'newDepartment', header: 'Phòng ban mới', meta: { width: 'w-[180px]' } },
      { accessorKey: 'newBlock', header: 'Khối mới', meta: { width: 'w-[160px]' } },
      { accessorKey: 'newBranch', header: 'Chi nhánh mới', meta: { width: 'w-[180px]' } },
      { accessorKey: 'description', header: 'Mô tả', meta: { width: 'w-[260px]' } },
    ],
    []
  )

  // Sticky header logic - scoped to this table instance (wide report)
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
        emptyMessage="Không có dữ liệu điều chuyển công tác"
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

export default JobTransferReportTable
