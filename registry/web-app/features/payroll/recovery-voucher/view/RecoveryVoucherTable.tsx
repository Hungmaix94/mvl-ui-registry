import { useMemo, useEffect } from 'react'
import { ColumnDef, Table, TableAction, Chip } from '@/components/ui'
import { IconEye, IconPencilsimple, IconTrash } from '@/assets/icons'
import { APP_PATH } from '@/routes'
import { useNavigate } from 'react-router-dom'
import TableError from '@/components/ui/table/TableError.tsx'
import { formatCurrencyVND } from '@/utils/common.ts'
import { format, parse } from 'date-fns'
import { type RecoveryVoucher } from '@/features/payroll/services/recovery-voucher-service'
import { useAbility } from '@/lib/ability.ts'
import useReceveryVoucherOptions from '@/features/payroll/recovery-voucher/_shares/hooks/useReceveryVoucherOptions.ts'
import {
  getStatusVariant,
  getVoucherTypeVariant,
} from '@/features/payroll/recovery-voucher/_shares/utils/recovery-voucher-colors.ts'
import { RecoveryVoucherType } from '@/constants/api-schema-aliases'
export type RecoveryVoucherTableProps = {
  data: RecoveryVoucher[]
  isLoading: boolean
  error: Error | null
  pageCount: number
  pageSize: number
  currentPage: number
  totalRecords: number
  ordering?: string
  onPaginationChange: (pageIndex: number, newPageSize: number) => void
  onSortingChange: (field: string, direction: 'asc' | 'desc' | null) => void
  onDeleteRecoveryVoucher?: (voucher: RecoveryVoucher) => void
  onClearFilter?: () => void
  hasFilter?: boolean
}

const RecoveryVoucherTable = ({
  data,
  isLoading,
  error,
  pageCount,
  pageSize,
  currentPage,
  totalRecords,
  onPaginationChange,
  onSortingChange,
  onDeleteRecoveryVoucher,
  onClearFilter,
  hasFilter,
}: RecoveryVoucherTableProps) => {
  const navigate = useNavigate()
  const ability = useAbility()
  const { voucherType: voucherTypeOptions, statusOptions } = useReceveryVoucherOptions()

  // Build label lookup maps from constants
  const voucherTypeMap = useMemo(
    () => new Map(voucherTypeOptions.map((opt) => [opt.value, opt.label])),
    [voucherTypeOptions]
  )
  const statusMap = useMemo(
    () => new Map(statusOptions.map((opt) => [opt.value, opt.label])),
    [statusOptions]
  )

  const getStatusLabel = (status: string): string => statusMap.get(status) || status
  const getVoucherTypeLabel = (voucherType: string): string =>
    voucherTypeMap.get(voucherType) || voucherType

  const columns: ColumnDef<RecoveryVoucher>[] = useMemo(
    () => [
      {
        accessorKey: 'code',
        header: 'Mã phiếu',
        meta: {
          width: 'w-[170px]',
        },
      },
      {
        accessorKey: 'name',
        header: 'Tên phiếu',
        meta: {
          width: 'w-[170px]',
        },
        cell: ({ getValue }) => {
          const value = getValue() as string
          return <span title={value}>{value || '-'}</span>
        },
      },
      {
        accessorKey: 'voucher_type',
        header: 'Loại phiếu',
        meta: {
          width: 'flex-1',
        },
        cell: ({ getValue }) => {
          const voucherType = getValue() as RecoveryVoucherType
          if (!voucherType) return <span className="text-content-dark-1 text-sm">-</span>
          return (
            <Chip
              label={getVoucherTypeLabel(voucherType)}
              variant={getVoucherTypeVariant(voucherType)}
              size="small"
            />
          )
        },
      },
      {
        accessorKey: 'employee.fullname',
        header: 'Nhân viên',
        meta: {
          width: 'w-[180px]',
        },
        cell: ({ row }) => {
          const employee = row.original.employee
          const fullname = employee?.fullname || '-'
          return <span title={fullname}>{fullname}</span>
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
        accessorKey: 'amount',
        header: 'Số tiền',
        meta: {
          width: 'flex-1',
          sortable: true,
        },
        cell: ({ getValue }) => {
          const value = getValue() as number
          return value ? formatCurrencyVND(value) : '-'
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
            <Chip label={getStatusLabel(status)} variant={getStatusVariant(status)} size="small" />
          )
        },
      },
    ],
    []
  )

  const actions: TableAction<RecoveryVoucher>[] = useMemo(() => {
    const rowActions: TableAction<RecoveryVoucher>[] = []

    if (ability.can('retrieve', 'payroll.recovery_voucher')) {
      rowActions.push({
        label: 'Xem chi tiết',
        icon: <IconEye size={16} />,
        onClick: (record) =>
          navigate(`${APP_PATH.RECOVERY_VOUCHER_DETAIL.replace(':id', String(record.id))}`, {
            state: { from: window.location.pathname + window.location.search },
          }),
      })
    }

    if (ability.can('update', 'payroll.recovery_voucher')) {
      rowActions.push({
        label: 'Chỉnh sửa',
        icon: <IconPencilsimple size={16} />,
        onClick: (record) =>
          navigate(`${APP_PATH.RECOVERY_VOUCHER_EDIT.replace(':id', String(record.id))}`, {
            state: { from: window.location.pathname + window.location.search },
          }),
      })
    }

    if (ability.can('destroy', 'payroll.recovery_voucher')) {
      rowActions.push({
        label: 'Xoá',
        icon: <IconTrash size={16} className="text-action-primary-red-default" />,
        variant: 'danger',
        onClick: (record) => onDeleteRecoveryVoucher?.(record),
      })
    }

    return rowActions
  }, [ability, navigate, onDeleteRecoveryVoucher])

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

export default RecoveryVoucherTable
