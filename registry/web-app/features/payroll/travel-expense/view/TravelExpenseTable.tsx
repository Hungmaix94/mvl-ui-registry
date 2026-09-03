import { useMemo, useEffect } from 'react'
import { ColumnDef, Table, TableAction, Chip } from '@/components/ui'
import { IconEye, IconPencilsimple, IconTrash } from '@/assets/icons'
import { type TravelExpense } from '@/features/payroll/services/travel-expense-service'
import { APP_PATH } from '@/routes'
import { useNavigate } from 'react-router-dom'
import TableError from '@/components/ui/table/TableError.tsx'
import { formatCurrencyVND } from '@/utils/common.ts'
import { format, parse } from 'date-fns'
import { ColoredValueVariant } from '@/api/schema.ts'
import { useAbility } from '@/lib/ability.ts'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
import { TravelExpenseType, RecoveryVoucherStatus } from '@/constants/api-schema-aliases'

// Công tác phí dùng chung enum trạng thái với phiếu thu hồi (cùng bộ giá trị).

type TravelExpenseTableProps = {
  // Data
  data: TravelExpense[]
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
  onDeleteTravelExpense?: (expense: TravelExpense) => void
  onClearFilter?: () => void
  hasFilter?: boolean
}

const TravelExpenseTable = ({
  data,
  isLoading,
  error,
  pageCount,
  pageSize,
  currentPage,
  totalRecords,
  onPaginationChange,
  onSortingChange,
  onDeleteTravelExpense,
  onClearFilter,
  hasFilter,
}: TravelExpenseTableProps) => {
  const navigate = useNavigate()
  const ability = useAbility()

  const { keysMap } = useAppConstant({
    module: 'payroll',
    keys: [
      APP_CONSTANT_KEY.PAYROLL.TRAVEL_EXPENSE_EXPENSE_TYPE,
      APP_CONSTANT_KEY.PAYROLL.TRAVEL_EXPENSE_TRAVEL_EXPENSE_STATUS,
    ],
  })

  // Expense type label mapping from constants
  const expenseTypeLabelMapping = useMemo(() => {
    return keysMap.has(APP_CONSTANT_KEY.PAYROLL.TRAVEL_EXPENSE_EXPENSE_TYPE)
      ? (keysMap.get(APP_CONSTANT_KEY.PAYROLL.TRAVEL_EXPENSE_EXPENSE_TYPE) as Record<
          string,
          string
        > | null) || {}
      : {}
  }, [keysMap])

  // Status label mapping from constants
  const statusLabelMapping = useMemo(() => {
    return keysMap.has(APP_CONSTANT_KEY.PAYROLL.TRAVEL_EXPENSE_TRAVEL_EXPENSE_STATUS)
      ? (keysMap.get(APP_CONSTANT_KEY.PAYROLL.TRAVEL_EXPENSE_TRAVEL_EXPENSE_STATUS) as Record<
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

  // Map expense_type to Chip variant
  const getExpenseTypeVariant = (expenseType: TravelExpenseType): ColoredValueVariant => {
    if (expenseType === TravelExpenseType.TAXABLE) {
      return ColoredValueVariant.PURPLE
    }
    return ColoredValueVariant.BLUE
  }

  const columns: ColumnDef<TravelExpense>[] = useMemo(
    () => [
      {
        accessorKey: 'code',
        header: 'Mã',
        meta: {
          width: 'w-[150px]',
          sortable: true,
        },
      },
      {
        accessorKey: 'name',
        header: 'Tên',
        meta: {
          width: 'w-[190px]',
          sortable: true,
        },
        cell: ({ getValue }) => {
          const value = getValue() as string
          return <span title={value}>{value || '-'}</span>
        },
      },
      {
        accessorKey: 'employee',
        header: 'Nhân viên',
        meta: {
          width: 'w-[180px]',
        },
        cell: ({ row }) => {
          const employee = row.original.employee
          const fullname = employee?.fullname || '-'
          const code = employee?.code || '-'
          return <span title={`${fullname} - ${code}`}>{`${fullname} - ${code}`}</span>
        },
      },
      {
        accessorKey: 'amount',
        header: 'Số tiền',
        meta: {
          width: 'w-[150px]',
          sortable: true,
        },
        cell: ({ getValue }) => {
          const value = getValue() as number
          return value ? formatCurrencyVND(value) : '-'
        },
      },
      {
        accessorKey: 'month',
        header: 'Kỳ tính lương',
        meta: {
          width: 'w-[140px]',
          sortable: true,
        },
        cell: ({ getValue }) => {
          const monthString = getValue() as string
          if (!monthString) return '-'
          try {
            const parsed = parse(monthString, 'MM/yyyy', new Date())
            return format(parsed, 'MM/yyyy')
          } catch {
            return monthString
          }
        },
      },
      {
        accessorKey: 'expense_type',
        header: 'Loại công tác phí',
        meta: {
          width: '210px',
        },
        cell: ({ getValue }) => {
          const expenseType = getValue() as TravelExpenseType
          if (!expenseType) return <span className="text-content-dark-1 text-sm">-</span>
          return (
            <Chip
              label={expenseTypeLabelMapping[expenseType] || expenseType}
              variant={getExpenseTypeVariant(expenseType)}
              size="small"
            />
          )
        },
      },
      {
        accessorKey: 'status',
        header: 'Trạng thái',
        meta: {
          width: '180px',
          sortable: true,
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
    [expenseTypeLabelMapping, statusLabelMapping]
  )

  // Define row actions - preserve current URL in navigation state
  const actions: TableAction<TravelExpense>[] = useMemo(() => {
    const baseActions: TableAction<TravelExpense>[] = []

    // View detail
    if (ability.can('retrieve', 'payroll.travel_expense')) {
      baseActions.push({
        label: 'Xem chi tiết',
        icon: <IconEye size={16} />,
        onClick: (record) =>
          navigate(`${APP_PATH.TRAVEL_EXPENSE_DETAIL.replace(':id', String(record.id))}`, {
            state: { from: window.location.pathname + window.location.search },
          }),
      })
    }

    // Edit
    if (ability.can('update', 'payroll.travel_expense')) {
      baseActions.push({
        label: 'Chỉnh sửa',
        icon: <IconPencilsimple size={16} />,
        onClick: (record) =>
          navigate(`${APP_PATH.TRAVEL_EXPENSE_EDIT.replace(':id', String(record.id))}`, {
            state: { from: window.location.pathname + window.location.search },
          }),
      })
    }

    // Delete
    if (ability.can('destroy', 'payroll.travel_expense')) {
      baseActions.push({
        label: 'Xoá',
        icon: <IconTrash size={16} className="text-action-primary-red-default" />,
        variant: 'danger',
        onClick: (record) => {
          onDeleteTravelExpense?.(record)
        },
      })
    }

    return baseActions
  }, [onDeleteTravelExpense, navigate, ability])

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
      rowActions={actions}
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

export default TravelExpenseTable
