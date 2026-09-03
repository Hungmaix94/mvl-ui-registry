import { useMemo, useEffect } from 'react'
import { ColumnDef, Table, Chip } from '@/components/ui'
import { type SalesRevenue } from '@/features/payroll/services/sales-revenue-service'
import TableError from '@/components/ui/table/TableError.tsx'
import { formatCurrencyVND } from '@/utils/common.ts'
import { format, parse } from 'date-fns'
import { ColoredValueVariant } from '@/api/schema.ts'
import { MONTH_FORMAT } from '@/constants/date-format.ts'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
import { RecoveryVoucherStatus } from '@/constants/api-schema-aliases'

type SalesRevenueTableProps = {
  // Data
  data: SalesRevenue[]
  isLoading: boolean
  error: Error | null

  // Pagination
  pageCount: number
  pageSize: number
  currentPage: number
  totalRecords: number

  // Sorting
  ordering?: string

  // Callbacks
  onPaginationChange: (pageIndex: number, newPageSize: number) => void
  onSortingChange: (field: string, direction: 'asc' | 'desc' | null) => void
  onDeleteSalesRevenue?: (revenue: SalesRevenue) => void
  onClearFilter?: () => void
  hasFilter?: boolean
}

const SalesRevenueTable = ({
  data,
  isLoading,
  error,
  pageCount,
  pageSize,
  currentPage,
  totalRecords,
  onPaginationChange,
  onSortingChange,
  onClearFilter,
  hasFilter,
}: SalesRevenueTableProps) => {
  const { keysMap } = useAppConstant({
    module: 'payroll',
    keys: [APP_CONSTANT_KEY.PAYROLL.SALES_REVENUE_SALES_REVENUE_STATUS],
  })

  // Status label mapping from constants
  const statusLabelMapping = useMemo(() => {
    return keysMap.has(APP_CONSTANT_KEY.PAYROLL.SALES_REVENUE_SALES_REVENUE_STATUS)
      ? (keysMap.get(APP_CONSTANT_KEY.PAYROLL.SALES_REVENUE_SALES_REVENUE_STATUS) as Record<
          string,
          string
        > | null) || {}
      : {}
  }, [keysMap])

  // Map status to Chip variant
  const getStatusVariant = (status: string): ColoredValueVariant => {
    if (status === RecoveryVoucherStatus.CALCULATED) {
      return ColoredValueVariant.GREY
    }
    if (status === RecoveryVoucherStatus.NOT_CALCULATED) {
      return ColoredValueVariant.RED
    }
    return ColoredValueVariant.GREY
  }

  const columns: ColumnDef<SalesRevenue>[] = useMemo(
    () => [
      {
        accessorKey: 'employee.code',
        header: 'Mã nhân viên',
        meta: {
          width: '150px',
          sortable: true,
        },
        cell: ({ getValue }) => {
          const value = getValue() as string
          return <span title={value}>{value || '-'}</span>
        },
      },
      {
        accessorKey: 'employee',
        header: 'Họ và tên',
        meta: {
          width: '200px',
        },
        cell: ({ row }) => {
          const employee = row.original.employee
          const fullname = employee?.fullname || '-'
          return <span title={`${fullname}`}>{`${fullname}`}</span>
        },
      },
      {
        accessorKey: 'position',
        header: 'Chức vụ',
        meta: {
          width: 'flex-1',
        },
        cell: ({ row }) => {
          const position = row.original.position
          return <span title={position?.name || '-'}>{position?.name || '-'}</span>
        },
      },
      {
        accessorKey: 'department',
        header: 'Phòng ban',
        meta: {
          width: '200px',
        },
        cell: ({ row }) => {
          const department = row.original.department
          return <span title={department?.name || '-'}>{department?.name || '-'}</span>
        },
      },
      {
        accessorKey: 'kpi_target',
        header: 'Chỉ tiêu',
        meta: {
          width: '180px',
          sortable: true,
        },
        cell: ({ getValue }) => {
          const value = getValue() as number
          return value ? formatCurrencyVND(value) : '-'
        },
      },
      {
        accessorKey: 'revenue',
        header: 'Doanh số',
        meta: {
          width: '180px',
          sortable: true,
        },
        cell: ({ getValue }) => {
          const value = getValue() as number
          return value ? formatCurrencyVND(value) : '-'
        },
      },
      {
        accessorKey: 'transaction_count',
        header: 'Số giao dịch',
        meta: {
          width: '150px',
          sortable: true,
        },
        cell: ({ getValue }) => {
          const value = getValue() as number
          return value ? formatCurrencyVND(value) : '-'
        },
      },
      {
        accessorKey: 'month',
        header: 'Kỳ',
        meta: {
          width: 'w-[100px]',
          sortable: true,
        },
        cell: ({ getValue }) => {
          const monthString = getValue() as string
          if (!monthString) return '-'
          try {
            const parsed = parse(monthString, MONTH_FORMAT, new Date())
            return format(parsed, MONTH_FORMAT)
          } catch {
            return monthString
          }
        },
      },
      {
        accessorKey: 'status',
        header: 'Trạng thái',
        meta: {
          width: 'w-[180px]',
        },
        cell: ({ getValue }) => {
          const status = getValue() as string
          if (!status) return <span className="text-content-dark-1 text-sm">-</span>
          return (
            <Chip
              label={statusLabelMapping[status] || status}
              variant={getStatusVariant(status)}
              size="small"
            />
          )
        },
      },
    ],
    [statusLabelMapping]
  )

  // Sticky header logic - find scroll container from page level
  useEffect(() => {
    let cleanup: (() => void) | null = null

    const timeoutId = setTimeout(() => {
      const scrollContainer = document.querySelector(
        '[class*="overflow-x-auto"][class*="overflow-y-auto"]'
      ) as HTMLElement
      if (!scrollContainer) return

      const table = scrollContainer.querySelector('table') as HTMLElement
      if (!table) return

      const thead = table.querySelector('thead') as HTMLElement
      if (!thead) return

      const navBar = document.querySelector('[data-name="Header"]') as HTMLElement

      const updateStickyTop = () => {
        if (!scrollContainer || !navBar) return

        const scrollContainerRect = scrollContainer.getBoundingClientRect()
        const navBarRect = navBar.getBoundingClientRect()
        const scrollContainerTop = scrollContainerRect.top
        const navBarBottom = navBarRect.bottom

        let topOffset = 0
        if (scrollContainerTop < navBarBottom) {
          topOffset = Math.max(0, navBarBottom - scrollContainerTop)
        }

        thead.style.top = `${topOffset}px`
      }

      updateStickyTop()

      const scrollHandler = () => {
        updateStickyTop()
      }
      scrollContainer.addEventListener('scroll', scrollHandler)
      window.addEventListener('scroll', scrollHandler)
      window.addEventListener('resize', updateStickyTop)

      cleanup = () => {
        scrollContainer.removeEventListener('scroll', scrollHandler)
        window.removeEventListener('scroll', scrollHandler)
        window.removeEventListener('resize', updateStickyTop)
      }
    }, 100)

    return () => {
      clearTimeout(timeoutId)
      if (cleanup) {
        cleanup()
      }
    }
  }, [data])

  if (error) {
    return <TableError />
  }

  return (
    <Table
      data={data}
      columns={columns}
      showSTT
      showActions
      enableSorting
      enablePagination
      pageSize={pageSize}
      manualPagination
      manualSorting
      currentPageIndex={currentPage - 1}
      pageCount={pageCount}
      totalRecords={totalRecords}
      onPaginationChange={onPaginationChange}
      onSortingChange={onSortingChange}
      isLoading={isLoading}
      hasFilter={hasFilter}
      onClearFilter={onClearFilter}
      disableInnerOverflow={true}
      paginationPosition="static"
      className="flex-1"
    />
  )
}

export default SalesRevenueTable
