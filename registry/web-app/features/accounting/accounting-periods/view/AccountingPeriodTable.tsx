import { useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ColumnDef } from '@tanstack/react-table'

import { AccountingPeriodStatus, ColoredValueVariant } from '@/api/schema'
import { IconEye, IconPencilsimple, IconTrash } from '@/assets/icons'
import { Chip, Table } from '@/components/ui'
import TableError from '@/components/ui/table/TableError'
import { PAGE_SIZE } from '@/constants/table'
import {
  type AccountingPeriod,
  useDeleteAccountingPeriod,
} from '@/features/accounting/accounting-periods/services/accounting-period-service'
import { useInvalidateQueries } from '@/hooks/useApiQuery'
import { useDialog } from '@/hooks/useDialog'
import { useAbility } from '@/lib/ability'
import { APP_PATH } from '@/routes'
import toastService from '@/services/toast-service'
import type { TableAction } from '@/types/table'
import { formatDate } from '@/utils/date-utils'
import useAppConstant from '@/hooks/useAppConstant'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import { useColumnConfig } from '@/hooks/useColumnConfig'
import type { ColumnConfig } from '@/types/table'

type Props = {
  data: AccountingPeriod[]
  isLoading: boolean
  error?: unknown
  totalRecords?: number
  pageSize?: number
  pageCount?: number
  currentPageIndex?: number
  onPaginationChange?: (pageIndex: number, pageSize: number) => void
  onDeleteSuccess?: () => void
  hasFilter?: boolean
  onClearFilter?: () => void
  isShowTableColumnConfig?: boolean
}

const AccountingPeriodTable = ({
  data,
  isLoading,
  error,
  totalRecords = 0,
  pageSize = PAGE_SIZE,
  pageCount = 0,
  currentPageIndex = 0,
  onPaginationChange,
  onDeleteSuccess,
  hasFilter,
  onClearFilter,
  isShowTableColumnConfig,
}: Props) => {
  const navigate = useNavigate()
  const ability = useAbility()

  const { keysMap } = useAppConstant({
    module: 'accounting',
    keys: [APP_CONSTANT_KEY.ACCOUNTING.ACCOUNTING_PERIOD_STATUS_CHOICES],
  })

  const statusLabels = keysMap.get(
    APP_CONSTANT_KEY.ACCOUNTING.ACCOUNTING_PERIOD_STATUS_CHOICES
  ) as Record<string, string> | null
  const { displayConfirm } = useDialog()
  const deleteMutation = useDeleteAccountingPeriod()
  const invalidateQueries = useInvalidateQueries()

  const handleDelete = useCallback(
    (record: AccountingPeriod) => {
      displayConfirm({
        title: 'Xác nhận xóa kỳ kế toán',
        content: (
          <div className="text-content-dark-2">
            Bạn có chắc chắn muốn xóa kỳ kế toán{' '}
            <strong>
              Tháng {record.month}/{record.year}
            </strong>
            ?
            <br />
            Thao tác này không thể hoàn tác.
          </div>
        ),
        confirmText: 'Xóa',
        cancelText: 'Hủy',
        confirmButtonClassName:
          'bg-action-primary-red-default hover:bg-action-primary-red-hover text-white',
        onConfirm: async () => {
          try {
            await deleteMutation.mutateAsync(record.id)
            toastService.success('Xóa kỳ kế toán thành công')
            await invalidateQueries.invalidateByPrefix('accounting/accounting-periods')
            onDeleteSuccess?.()
          } catch {
            // Handled by service layer / react query
          }
        },
      })
    },
    [displayConfirm, deleteMutation, invalidateQueries, onDeleteSuccess]
  )

  const allColumns = useMemo<ColumnDef<AccountingPeriod>[]>(
    () => [
      {
        accessorKey: 'year',
        header: 'Năm',
        cell: ({ getValue }) => getValue() as number,
        meta: { width: 'w-[100px]', sortable: true },
      },
      {
        accessorKey: 'month',
        header: 'Tháng',
        cell: ({ getValue }) => `Tháng ${getValue() as number}`,
        meta: { width: 'w-[120px]', sortable: true },
      },
      {
        accessorKey: 'status',
        header: 'Trạng thái',
        cell: ({ getValue }) => {
          const status = getValue() as AccountingPeriodStatus
          const label = statusLabels?.[status] ?? status

          const variantMap: Record<AccountingPeriodStatus, ColoredValueVariant> = {
            [AccountingPeriodStatus.OPEN]: ColoredValueVariant.GREEN,
            [AccountingPeriodStatus.SOFT_CLOSED]: ColoredValueVariant.ORANGE,
            [AccountingPeriodStatus.HARD_CLOSED]: ColoredValueVariant.RED,
          }
          const variant = variantMap[status] ?? ColoredValueVariant.GREY

          return <Chip variant={variant} label={label} size="small" />
        },
        meta: { width: 'w-[140px]', sortable: true },
      },
      {
        accessorKey: 'locks_apply_at',
        header: 'Khóa áp dụng lúc',
        cell: ({ getValue }) => {
          const val = getValue() as string | null
          return val ? formatDate(val, 'dd/MM/yyyy HH:mm') : '—'
        },
        meta: { sortable: true },
      },
      {
        accessorKey: 'created_at',
        header: 'Ngày tạo',
        cell: ({ getValue }) => formatDate(getValue() as string),
        meta: { width: 'w-[150px]', sortable: true },
      },
      {
        accessorKey: 'updated_at',
        header: 'Ngày cập nhật',
        cell: ({ getValue }) => formatDate(getValue() as string),
        meta: { width: 'w-[150px]', sortable: true },
      },
    ],
    [statusLabels]
  )

  const defaultColumnConfig: ColumnConfig[] = useMemo(
    () => [
      { id: 'year', label: 'Năm', visible: true, order: 0 },
      { id: 'month', label: 'Tháng', visible: true, order: 1 },
      { id: 'status', label: 'Trạng thái', visible: true, order: 2 },
      { id: 'locks_apply_at', label: 'Khóa áp dụng lúc', visible: true, order: 3 },
      { id: 'created_at', label: 'Ngày tạo', visible: true, order: 4 },
      { id: 'updated_at', label: 'Ngày cập nhật', visible: true, order: 5 },
    ],
    []
  )

  const {
    columns: columnConfig,
    handleApply,
    handleReset,
  } = useColumnConfig(defaultColumnConfig, {
    storageKey: 'accounting-periods',
  })

  const visibleColumns = useMemo(() => {
    return columnConfig
      .filter((c) => c.visible)
      .sort((a, b) => a.order - b.order)
      .map((c) => allColumns.find((col) => (col as any).accessorKey === c.id || col.id === c.id))
      .filter(Boolean) as ColumnDef<AccountingPeriod>[]
  }, [columnConfig, allColumns])

  const actions: TableAction<AccountingPeriod>[] = useMemo(
    () => [
      {
        label: 'Xem chi tiết',
        icon: <IconEye size={16} />,
        show: () => ability.can('retrieve', 'accountingperiod'),
        onClick: (record) => {
          navigate(APP_PATH.ACCOUNTING_PERIOD_DETAIL.replace(':id', record.id.toString()))
        },
      },
      {
        label: 'Chỉnh sửa',
        icon: <IconPencilsimple size={16} />,
        show: (record) =>
          ability.can('update', 'accountingperiod') &&
          record.status !== AccountingPeriodStatus.HARD_CLOSED,
        onClick: (record) => {
          navigate(APP_PATH.ACCOUNTING_PERIOD_EDIT.replace(':id', record.id.toString()))
        },
      },
      {
        label: 'Xóa',
        icon: <IconTrash size={16} />,
        variant: 'danger',
        show: (record) =>
          ability.can('destroy', 'accountingperiod') &&
          record.status !== AccountingPeriodStatus.HARD_CLOSED,
        onClick: (record) => handleDelete(record),
      },
    ],
    [ability, navigate, handleDelete]
  )

  if (error) {
    return <TableError />
  }

  return (
    <div className="border-border-1">
      <Table
        data={data || []}
        columns={visibleColumns}
        showSTT
        showActions
        actionRenderType="menu"
        // Menu mở tại con trỏ khi bấm vào dòng — mặc định của `Table`. Giá trị `cell` trước đây
        // lọt vào 7 bảng kế toán cùng lượt ở commit 4c1aefb43 (21/05), không phải lựa chọn riêng
        // của màn nào; xem `_docs/guide/cursor-position-action-menu.md`.
        actionMenuPosition="cursor"
        rowActions={actions}
        isLoading={isLoading}
        totalRecords={totalRecords}
        pageSize={pageSize}
        pageCount={pageCount}
        currentPageIndex={currentPageIndex}
        onPaginationChange={onPaginationChange}
        enablePagination
        manualPagination
        hasFilter={hasFilter}
        onClearFilter={onClearFilter}
        isShowTableColumnConfig={isShowTableColumnConfig}
        columnConfig={columnConfig}
        onColumnConfigApply={handleApply}
        onColumnConfigReset={handleReset}
        disableInnerOverflow
        paginationPosition="static"
        stickyHeader
      />
    </div>
  )
}

export default AccountingPeriodTable
