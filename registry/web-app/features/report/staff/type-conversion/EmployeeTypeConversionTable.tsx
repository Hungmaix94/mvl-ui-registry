import { useLayoutEffect, useMemo, useRef } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { Table } from '@/components/ui'
import type { EmployeeTypeConversionBranchItem } from '@/services'
import { formatDate } from '@/utils/date-utils'
import { DATE_FORMAT } from '@/constants/date-format'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'

type EmployeeTypeConversionRow = {
  id: number
  contractCode: string
  employeeCode: string
  employeeName: string
  branchName: string
  departmentName: string
  oldEmployeeType: string
  newEmployeeType: string
  createdAt: string
  date: string
  fromDate: string
  toDate: string
  note: string
}

type EmployeeTypeConversionTableProps = {
  data?: EmployeeTypeConversionBranchItem[]
  isLoading?: boolean
  enablePagination?: boolean
  pageSize?: number
  manualPagination?: boolean
  pageCount?: number
  totalRecords?: number
  currentPageIndex?: number
  onPaginationChange?: (pageIndex: number, pageSize: number) => void
}

/**
 * Flatten nested structure: Branch -> Block -> Department -> Reports[]
 * Each report item already has branch, block, department nested, so use those
 */
function flattenEmployeeTypeConversionData(
  branches: EmployeeTypeConversionBranchItem[] | undefined
): EmployeeTypeConversionRow[] {
  if (!branches || branches.length === 0) {
    return []
  }

  const rows: EmployeeTypeConversionRow[] = []
  let totalReports = 0

  branches.forEach((branch) => {
    branch.children?.forEach((block) => {
      block.children?.forEach((department) => {
        department.children?.forEach((report) => {
          // Use branch/department from report item (more accurate), fallback to parent if missing
          const branchName = report.branch?.name || branch.name || '-'
          const departmentName = report.department?.name || department.name || '-'

          rows.push({
            id: report.id,
            contractCode: report.contract?.code || '-',
            employeeCode: report.employee?.code || '-',
            employeeName: report.employee?.fullname || '-',
            branchName,
            departmentName,
            oldEmployeeType: report.old_employee_type || '-',
            newEmployeeType: report.new_employee_type || '-',
            createdAt: report.created_at || '-',
            date: report.date || '-',
            fromDate: report.from_date || '-',
            toDate: report.to_date || '-',
            note: report.note || '-',
          })
          totalReports++
        })
      })
    })
  })

  return rows
}

const EmployeeTypeConversionTable = ({
  data = [],
  isLoading,
  enablePagination = false,
  pageSize,
  manualPagination = false,
  pageCount,
  totalRecords,
  currentPageIndex,
  onPaginationChange,
}: EmployeeTypeConversionTableProps) => {
  const tableWrapperRef = useRef<HTMLDivElement | null>(null)

  const { keysMap } = useAppConstant({
    module: 'hrm',
    keys: [APP_CONSTANT_KEY.HRM.EMPLOYEE_TYPE],
  })

  const employeeTypeLabels = useMemo(() => {
    return keysMap.get(APP_CONSTANT_KEY.HRM.EMPLOYEE_TYPE) || {}
  }, [keysMap])

  const rows: EmployeeTypeConversionRow[] = useMemo(() => {
    return flattenEmployeeTypeConversionData(data)
  }, [data])

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
  }, [rows])

  const columns: ColumnDef<EmployeeTypeConversionRow>[] = useMemo(
    () => [
      {
        accessorKey: 'contractCode',
        header: 'Số hợp đồng',
        meta: {
          width: 'w-[150px]',
          frozen: true,
        },
      },
      {
        accessorKey: 'employeeCode',
        header: 'Mã nhân viên',
        meta: {
          width: 'w-[150px]',
          frozen: true,
        },
      },
      {
        accessorKey: 'employeeName',
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
        accessorKey: 'departmentName',
        header: 'Phòng ban',
        meta: {
          width: 'w-[200px]',
        },
      },
      {
        accessorKey: 'oldEmployeeType',
        header: 'Loại nhân viên cũ',
        cell: ({ getValue }) => {
          const value = getValue() as string
          return value === '-' ? '-' : employeeTypeLabels[value] || value
        },
        meta: {
          width: 'w-[180px]',
        },
      },
      {
        accessorKey: 'newEmployeeType',
        header: 'Loại nhân viên mới',
        cell: ({ getValue }) => {
          const value = getValue() as string
          return value === '-' ? '-' : employeeTypeLabels[value] || value
        },
        meta: {
          width: 'w-[180px]',
        },
      },
      {
        accessorKey: 'createdAt',
        header: 'Ngày tạo',
        cell: ({ getValue }) => {
          const value = getValue() as string
          return value === '-' ? '-' : formatDate(value, DATE_FORMAT)
        },
        meta: {
          width: 'w-[120px]',
        },
      },
      {
        accessorKey: 'fromDate',
        header: 'Ngày hiệu lực',
        cell: ({ getValue }) => {
          const value = getValue() as string
          return value === '-' ? '-' : formatDate(value, DATE_FORMAT)
        },
        meta: {
          width: 'w-[120px]',
        },
      },
      {
        accessorKey: 'toDate',
        header: 'Ngày hết hạn',
        cell: ({ getValue }) => {
          const value = getValue() as string
          return value === '-' ? '-' : formatDate(value, DATE_FORMAT)
        },
        meta: {
          width: 'w-[120px]',
        },
      },
      {
        accessorKey: 'note',
        header: 'Ghi chú',
        meta: {
          width: 'w-[250px]',
        },
      },
    ],
    [employeeTypeLabels]
  )

  return (
    <div ref={tableWrapperRef}>
      <Table
        data={rows}
        columns={columns}
        enableSorting={false}
        showSTT
        sttFrozen
        isLoading={isLoading}
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

export default EmployeeTypeConversionTable
