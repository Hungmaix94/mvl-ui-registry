import { useMemo, useEffect } from 'react'
import { Chip, ColumnDef, Table, TableAction } from '@/components/ui'
import { IconEye, IconPencilsimple, IconTrash } from '@/assets/icons'
import { type RecruitmentExpense } from '@/features/recruitment/services/recruitment-expense-service'
import { APP_PATH } from '@/routes'
import { useNavigate } from 'react-router-dom'
import TableError from '@/components/ui/table/TableError.tsx'
import { formatCurrencyVND } from '@/utils/common.ts'
import { Flex } from '@radix-ui/themes'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
import { ColoredValueVariant } from '@/api/schema.ts'
import { IS_VALID_CHIP } from '@/constants/recruitment-expense-filter.ts'
import { RecruitmentExpensePaymentStatus } from '@/constants/api-schema-aliases'

type RecruitmentExpenseTableProps = {
  // Data
  data: RecruitmentExpense[]
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
  onDeleteRecruitmentExpense?: (expense: RecruitmentExpense) => void
  onClearFilter?: () => void
  hasFilter?: boolean

  // Row selection
  selectedRows?: RecruitmentExpense[]
  onSelectionChange?: (rows: RecruitmentExpense[]) => void
  enableRowSelection?: boolean
}

const RecruitmentExpenseTable = ({
  data,
  isLoading,
  error,
  pageCount,
  pageSize,
  currentPage,
  totalRecords,
  onPaginationChange,
  onSortingChange,
  onDeleteRecruitmentExpense,
  onClearFilter,
  hasFilter,
  selectedRows,
  onSelectionChange,
  enableRowSelection,
}: RecruitmentExpenseTableProps) => {
  const navigate = useNavigate()

  const { keysMapOptions } = useAppConstant({
    module: 'hrm',
    keys: [APP_CONSTANT_KEY.RECRUITMENT.EXPENSE.RecruitmentExpensePaymentStatus],
  })

  const paymentStatusLabelMap = useMemo(() => {
    const constantsOptions =
      keysMapOptions.get(APP_CONSTANT_KEY.RECRUITMENT.EXPENSE.RecruitmentExpensePaymentStatus) || []
    return new Map(constantsOptions.map((o) => [String(o.value), String(o.label)]))
  }, [keysMapOptions])

  const paymentStatusVariantMap: Record<string, ColoredValueVariant> = useMemo(
    () => ({
      [String(RecruitmentExpensePaymentStatus.EXPECTED)]: ColoredValueVariant.GREY,
      [String(RecruitmentExpensePaymentStatus.PAID)]: ColoredValueVariant.GREEN,
    }),
    []
  )

  const columns: ColumnDef<RecruitmentExpense>[] = useMemo(
    () => [
      {
        accessorKey: 'date',
        header: 'Thời gian',
        meta: {
          width: 'w-[120px]',
          sortable: true,
        },
      },
      {
        accessorKey: 'recruitment_source.name',
        header: 'Nguồn tuyển dụng',
        meta: {
          width: 'w-[220px]',
        },
      },
      {
        accessorKey: 'recruitment_channel.name',
        header: 'Kênh tuyển dụng',
        meta: {
          width: 'w-[250px]',
        },
      },
      {
        accessorKey: 'branch.name',
        header: 'Chi nhánh',
        meta: {
          width: 'w-[180px]',
        },
      },
      {
        accessorKey: 'payment_status',
        header: 'Trạng thái',
        meta: {
          width: 'w-[180px]',
        },
        cell: ({ getValue }) => {
          const paymentStatus = getValue() as
            | RecruitmentExpense['payment_status']
            | undefined
            | null

          if (!paymentStatus) return '-'

          const label = paymentStatusLabelMap.get(String(paymentStatus)) ?? String(paymentStatus)
          const variant = paymentStatusVariantMap[String(paymentStatus)] ?? ColoredValueVariant.GREY

          return <Chip label={label} variant={variant} size="small" type="outlined" />
        },
      },
      {
        accessorKey: 'is_valid',
        header: 'Hợp lệ',
        meta: {
          width: 'w-[140px]',
        },
        cell: ({ getValue }) => {
          const value = getValue() as RecruitmentExpense['is_valid']
          if (value === null || value === undefined) return '-'
          const cfg = IS_VALID_CHIP[value ? 'true' : 'false']
          return <Chip label={cfg.label} variant={cfg.variant} size="small" type="outlined" />
        },
      },
      {
        accessorKey: 'payer',
        header: 'Người chi',
        meta: {
          width: 'w-[200px]',
        },
        cell: ({ getValue }) => {
          const payer = getValue() as RecruitmentExpense['payer']
          if (!payer) return '-'
          return payer.code && payer.fullname ? (
            <>
              <Flex direction={'column'} title={`Mã: ${payer.code}\nTên: ${payer.fullname}`}>
                <span>{payer.code}</span>
                <span>{payer.fullname}</span>
              </Flex>
            </>
          ) : (
            payer.fullname || payer.code || '-'
          )
        },
      },
      {
        accessorKey: 'referee',
        header: 'Người được giới thiệu',
        meta: {
          width: 'w-[200px]',
        },
        cell: ({ row }) => {
          const referee = row.original.referee
          if (!referee?.fullname && !referee?.code) return '-'

          const branch = referee?.branch?.name || '-'
          const block = referee?.block?.name || '-'
          const department = referee?.department?.name || '-'

          return (
            <div className="flex flex-col gap-1">
              <span className="typo-body-base-semibold text-content-dark-1">
                {referee?.fullname || '-'}
              </span>
              <span className="typo-body-sm text-content-dark-3">Mã: {referee?.code || '-'}</span>
              {(branch !== '-' || block !== '-' || department !== '-') && (
                <Flex direction="column" className="typo-body-xs-regular text-content-dark-3">
                  <span> • Chi nhánh: {branch}</span>
                  <span> • Khối: {block}</span>
                  <span> • Phòng ban: {department}</span>
                </Flex>
              )}
            </div>
          )
        },
      },
      {
        accessorKey: 'referrer',
        header: 'Người giới thiệu',
        meta: {
          width: 'w-[200px]',
        },
        cell: ({ row }) => {
          const referrer = row.original.referrer
          if (!referrer?.fullname && !referrer?.code) return '-'

          const branch = referrer?.branch?.name || '-'
          const block = referrer?.block?.name || '-'
          const department = referrer?.department?.name || '-'

          return (
            <div className="flex flex-col gap-1">
              <span className="typo-body-base-semibold text-content-dark-1">
                {referrer?.fullname || '-'}
              </span>
              <span className="typo-body-sm text-content-dark-3">Mã: {referrer?.code || '-'}</span>
              {(branch !== '-' || block !== '-' || department !== '-') && (
                <Flex direction="column" className="typo-body-xs-regular text-content-dark-3">
                  <span> • Chi nhánh: {branch}</span>
                  <span> • Khối: {block}</span>
                  <span> • Phòng ban: {department}</span>
                </Flex>
              )}
            </div>
          )
        },
      },
      {
        accessorKey: 'total_cost',
        header: 'Tổng chi phí',
        meta: {
          width: 'w-[150px]',
          sortable: true,
        },
        cell: ({ getValue }) => {
          const value = getValue() as number
          return value ? formatCurrencyVND(value) : '-'
        },
      },
    ],
    [paymentStatusLabelMap, paymentStatusVariantMap]
  )

  // Define row actions - preserve current URL in navigation state
  const actions: TableAction<RecruitmentExpense>[] = useMemo(
    () => [
      // View detail
      {
        label: 'Xem chi tiết',
        icon: <IconEye size={16} />,
        onClick: (record) =>
          navigate(`${APP_PATH.RECRUITMENT_EXPENSE_DETAIL.replace(':id', String(record.id))}`, {
            state: { from: window.location.pathname + window.location.search },
          }),
      },
      {
        label: 'Chỉnh sửa',
        icon: <IconPencilsimple size={16} />,
        onClick: (record) =>
          navigate(`${APP_PATH.RECRUITMENT_EXPENSE_EDIT.replace(':id', String(record.id))}`, {
            state: { from: window.location.pathname + window.location.search },
          }),
      },
      {
        label: 'Xoá',
        icon: <IconTrash size={16} className="text-action-primary-red-default" />,
        variant: 'danger',
        onClick: (record) => {
          onDeleteRecruitmentExpense?.(record)
        },
      },
    ],
    [onDeleteRecruitmentExpense, navigate]
  )

  // Sticky header logic - similar to EmployeeTable
  // Find scroll container from page level (it's an ancestor of the table)
  useEffect(() => {
    let cleanup: (() => void) | null = null

    // Use a small delay to ensure DOM is ready
    const timeoutId = setTimeout(() => {
      // Find the table element - look for table within overflow container
      // The scroll container at page level will have overflow-x-auto class
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

        // Calculate top offset: header should stick right below navbar
        // When scroll container is at initial position, offset = distance from container top to navbar bottom
        // When scrolling, adjust so header stays below navbar
        let topOffset = 0
        if (scrollContainerTop < navBarBottom) {
          // Scroll container is below or overlapping navbar
          // Offset should be the distance from container top to navbar bottom
          topOffset = Math.max(0, navBarBottom - scrollContainerTop)
        } else {
          // Scroll container is above navbar (scrolled past)
          topOffset = 0
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

      // Store cleanup function
      cleanup = () => {
        scrollContainer.removeEventListener('scroll', scrollHandler)
        window.removeEventListener('scroll', scrollHandler)
        window.removeEventListener('resize', updateStickyTop)
      }
    }, 100)

    // Cleanup timeout and event listeners
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
      sttFrozen
      showActions
      rowActions={actions}
      enableSorting
      manualSorting
      enablePagination
      manualPagination
      disableInnerOverflow={true}
      pageSize={pageSize}
      currentPageIndex={currentPage - 1}
      pageCount={pageCount}
      totalRecords={totalRecords}
      onPaginationChange={onPaginationChange}
      onSortingChange={onSortingChange}
      isLoading={isLoading}
      hasFilter={hasFilter}
      onClearFilter={onClearFilter}
      paginationPosition="static"
      enableRowSelection={enableRowSelection}
      selectedRows={selectedRows}
      onSelectionChange={onSelectionChange}
      getRowId={(row) => String(row.id)}
    />
  )
}

export default RecruitmentExpenseTable
