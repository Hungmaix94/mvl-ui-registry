import { useCallback, useEffect, useMemo } from 'react'
import { ColumnDef, Table, TableAction, Chip } from '@/components/ui'
import { IconCheckcircle, IconEye, IconPencilsimple, IconProhibit, IconTrash } from '@/assets/icons'
import { APP_PATH } from '@/routes'
import { useNavigate } from 'react-router-dom'
import TableError from '@/components/ui/table/TableError'
import { formatCurrencyVND } from '@/utils/common'
import { format, parse } from 'date-fns'
import {
  type PenaltyTicket,
  usePartialUpdatePenaltyTicket,
} from '@/features/payroll/services/penalty-ticket-service'
import usePenaltyTicketOptions from '../_shares/hooks/usePenaltyTicketOptions'
import { useAbility } from '@/lib/ability.ts'
import {
  getStatusVariant,
  getViolationTypeVariant,
} from '../_shares/utils/penalty-ticket-colors.ts'
import { PatchedPenaltyTicketUpdateRequestViolation_type } from '@/api/schema'
import { PenaltyTicketStatus } from '@/constants/api-schema-aliases.ts'
import toastService from '@/services/toast-service'
import { useMarkPaidDialog } from './hooks/useMarkPaidDialog'

export type PenaltyTicketTableProps = {
  data: PenaltyTicket[]
  isLoading: boolean
  error: Error | null
  pageCount: number
  pageSize: number
  currentPage: number
  totalRecords: number
  ordering?: string
  onPaginationChange: (pageIndex: number, newPageSize: number) => void
  onSortingChange: (field: string, direction: 'asc' | 'desc' | null) => void
  onDeletePenaltyTicket?: (ticket: PenaltyTicket) => void
  onClearFilter?: () => void
  hasFilter?: boolean
  selectedRows?: PenaltyTicket[]
  onSelectionChange?: (rows: PenaltyTicket[]) => void
  enableRowSelection?: boolean
}

export default function PenaltyTicketTable({
  data,
  isLoading,
  error,
  pageCount,
  pageSize,
  currentPage,
  totalRecords,
  onPaginationChange,
  onSortingChange,
  onDeletePenaltyTicket,
  onClearFilter,
  hasFilter,
  selectedRows,
  onSelectionChange,
  enableRowSelection,
}: PenaltyTicketTableProps) {
  const navigate = useNavigate()
  const { statusOptions, violationTypeOptions } = usePenaltyTicketOptions()
  const partialUpdate = usePartialUpdatePenaltyTicket()
  const { openMarkPaidDialog } = useMarkPaidDialog()
  const ability = useAbility()

  const statusLabelMap = useMemo(
    () => new Map(statusOptions.map((o) => [o.value, o.label])),
    [statusOptions]
  )
  const violationLabelMap = useMemo(
    () => new Map(violationTypeOptions.map((o) => [o.value, o.label])),
    [violationTypeOptions]
  )

  const getStatusLabel = useCallback(
    (status?: PenaltyTicketStatus) => (status ? statusLabelMap.get(status) || status : '-'),
    [statusLabelMap]
  )

  const getViolationLabel = useCallback(
    (type?: PatchedPenaltyTicketUpdateRequestViolation_type) =>
      type ? violationLabelMap.get(type) || type : '-',
    [violationLabelMap]
  )

  const markUnpaid = async (ticket: PenaltyTicket) => {
    try {
      await partialUpdate.mutateAsync({
        id: ticket.id,
        data: { status: PenaltyTicketStatus.UNPAID } as any,
      })
      toastService.success('Đã đánh dấu chưa nộp phạt.')
    } catch {}
  }

  const columns: ColumnDef<PenaltyTicket>[] = useMemo(
    () => [
      { accessorKey: 'code', header: 'Mã phiếu', meta: { width: 'w-[170px]' } },
      {
        accessorKey: 'month',
        header: 'Kỳ tính lương',
        meta: { width: 'w-[140px]', sortable: true },
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
        accessorKey: 'employee.fullname',
        header: 'Họ tên',
        meta: { width: 'w-[180px]' },
        cell: ({ row }) => (
          <span title={row.original.employee?.fullname || '-'}>
            {row.original.employee?.fullname || '-'}
          </span>
        ),
      },
      {
        accessorKey: 'department.name',
        header: 'Phòng ban',
        meta: { width: 'w-[160px]' },
        cell: ({ row }) => (
          <span title={row.original.department?.name || '-'}>
            {row.original.department?.name || '-'}
          </span>
        ),
      },
      {
        accessorKey: 'violation_type',
        header: 'Loại vi phạm',
        meta: { width: 'w-[160px]' },
        cell: ({ getValue }) => {
          const type = getValue() as PatchedPenaltyTicketUpdateRequestViolation_type
          if (!type) return <span className="text-content-dark-1 text-sm">-</span>
          return (
            <Chip
              label={getViolationLabel(type)}
              variant={getViolationTypeVariant(type)}
              size="small"
            />
          )
        },
      },
      { accessorKey: 'violation_count', header: 'Số lần vi phạm', meta: { width: 'w-[140px]' } },
      {
        accessorKey: 'amount',
        header: 'Số tiền',
        meta: { width: 'w-[140px]', sortable: true },
        cell: ({ getValue }) => {
          const value = getValue() as number
          return value ? formatCurrencyVND(value) : '-'
        },
      },
      {
        accessorKey: 'status',
        header: 'Trạng thái',
        meta: { width: 'w-[140px]' },
        cell: ({ getValue }) => {
          const status = getValue() as PenaltyTicketStatus
          if (!status) return <span className="text-content-dark-1 text-sm">-</span>
          return (
            <Chip label={getStatusLabel(status)} variant={getStatusVariant(status)} size="small" />
          )
        },
      },
    ],
    [getStatusLabel, getViolationLabel]
  )

  const actions: TableAction<PenaltyTicket>[] = useMemo(
    () => [
      {
        label: 'Đánh dấu đã nộp phạt',
        icon: <IconCheckcircle size={16} />,
        show: (record) =>
          ability.can('partial_update', 'payroll.penalty_ticket') &&
          record.status === PenaltyTicketStatus.UNPAID,
        onClick: (record) => openMarkPaidDialog(record),
      },
      {
        label: 'Đánh dấu chưa nộp phạt',
        icon: <IconProhibit size={16} />,
        show: (record) =>
          ability.can('partial_update', 'payroll.penalty_ticket') &&
          record.status === PenaltyTicketStatus.PAID,
        onClick: (record) => markUnpaid(record),
      },
      {
        label: 'Xem chi tiết',
        icon: <IconEye size={16} />,
        show: () => ability.can('retrieve', 'payroll.penalty_ticket'),
        onClick: (record) =>
          navigate(`${APP_PATH.PENALTY_MANAGEMENT_DETAIL.replace(':id', String(record.id))}`, {
            state: { from: window.location.pathname + window.location.search },
          }),
      },
      {
        label: 'Chỉnh sửa',
        icon: <IconPencilsimple size={16} />,
        show: (record) =>
          ability.can('update', 'payroll.penalty_ticket') &&
          record.status === PenaltyTicketStatus.UNPAID,
        onClick: (record) =>
          navigate(`${APP_PATH.PENALTY_MANAGEMENT_EDIT.replace(':id', String(record.id))}`, {
            state: { from: window.location.pathname + window.location.search },
          }),
      },
      {
        label: 'Xoá',
        icon: <IconTrash size={16} className="text-action-primary-red-default" />,
        variant: 'danger',
        show: () => ability.can('destroy', 'payroll.penalty_ticket'),
        onClick: (record) => onDeletePenaltyTicket?.(record),
      },
    ],
    [ability, navigate, onDeletePenaltyTicket, openMarkPaidDialog, markUnpaid]
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

  if (error) return <TableError />

  return (
    <>
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
        enableRowSelection={enableRowSelection}
        selectedRows={selectedRows}
        onSelectionChange={onSelectionChange}
        disableInnerOverflow={true}
        paginationPosition="static"
        className="flex-1"
      />
    </>
  )
}
