import { useMemo } from 'react'
import { format, isValid, parseISO } from 'date-fns'
import { useNavigate } from 'react-router-dom'

import { ColumnDef, Table, TableAction } from '@/components/ui'
import TableError from '@/components/ui/table/TableError'
import { IconCheck, IconDownload, IconEye, IconPencilsimple, IconX } from '@/assets/icons'
import { APP_PATH } from '@/routes'
import { useAbility } from '@/lib/ability.ts'
import { DATE_FORMAT } from '@/constants/date-format.ts'
import { formatNumber, formatPct } from '@/utils/common'
import { type CollaboratorContractList } from '@/features/accounting/collaborator-contracts/services/collaborator-contract-service'
import ContractStatusChip from '@/features/accounting/collaborator-contracts/_shares/components/ContractStatusChip'
import { ContractStatus } from '@/features/accounting/collaborator-contracts/types/collaborator-contract-types'
import { useColumnConfig } from '@/hooks/useColumnConfig'
import type { ColumnConfig } from '@/types/table'

type CollaboratorContractTableProps = {
  data: CollaboratorContractList[]
  isLoading: boolean
  error: Error | null
  pageCount: number
  pageSize: number
  currentPage: number
  totalRecords: number
  onPaginationChange: (pageIndex: number, newPageSize: number) => void
  onMarkSigned?: (record: CollaboratorContractList) => void
  onCancel?: (record: CollaboratorContractList) => void
  onClearFilter?: () => void
  hasFilter?: boolean
  isShowTableColumnConfig?: boolean
}

const formatDateValue = (value?: string | null): string => {
  if (!value) return '-'
  try {
    const d = parseISO(value)
    if (!isValid(d)) return '-'
    return format(d, DATE_FORMAT)
  } catch {
    return '-'
  }
}

const CollaboratorContractTable = ({
  data,
  isLoading,
  error,
  pageCount,
  pageSize,
  currentPage,
  totalRecords,
  onPaginationChange,
  onMarkSigned,
  onCancel,
  onClearFilter,
  hasFilter,
  isShowTableColumnConfig,
}: CollaboratorContractTableProps) => {
  const navigate = useNavigate()
  const ability = useAbility()

  const allColumns: ColumnDef<CollaboratorContractList>[] = useMemo(
    () => [
      {
        accessorKey: 'code',
        header: 'Mã HĐ',
        cell: ({ getValue }) => {
          const v = getValue() as string | null
          return v ? <code className="text-content-dark-1">{v}</code> : '-'
        },
        meta: { width: 'w-[160px]', sortable: true },
      },
      {
        accessorKey: 'contract_number',
        header: 'Số HĐ',
        cell: ({ getValue }) => (getValue() as string | null) || '-',
        meta: { width: 'w-[130px]', sortable: true },
      },
      {
        id: 'collaborator_display',
        header: 'Cộng tác viên',
        cell: ({ row }) => {
          const c = row.original.collaborator_detail
          if (!c) return '-'
          return (
            <div className="flex flex-col">
              <span className="typo-body-base-medium text-content-dark-1">{c.name || '-'}</span>
              {c.code && <span className="typo-body-sm-regular text-content-dark-3">{c.code}</span>}
            </div>
          )
        },
        meta: { width: 'w-[200px]', sortable: false },
      },
      {
        accessorKey: 'signed_date',
        header: 'Ngày ký',
        cell: ({ getValue }) => formatDateValue(getValue() as string | null),
        meta: { width: 'w-[110px]', sortable: true },
      },
      {
        accessorKey: 'fixed_amount',
        header: 'Giá trị HH',
        cell: ({ getValue }) => {
          const v = getValue() as string | null
          return v ? `${formatNumber(v)} đ` : '-'
        },
        meta: { width: 'w-[150px]', sortable: true, align: 'right' },
      },
      {
        accessorKey: 'pct_commission',
        header: '% HH',
        cell: ({ getValue }) => {
          const v = getValue() as string | null
          // pct_commission là numeric(14,10) — in thẳng chuỗi BE sẽ ra "3.3333333333"
          // (dấu chấm, không theo locale vi-VN). Đi qua formatPct với 10 chữ số thập phân.
          return v ? formatPct(v, 10) : '-'
        },
        meta: { width: 'w-[80px]', sortable: true, align: 'right' },
      },
      {
        accessorKey: 'status',
        header: 'Trạng thái',
        cell: ({ getValue }) => <ContractStatusChip status={getValue() as string | null} />,
        meta: { width: 'w-[120px]', sortable: false },
      },
    ],
    []
  )

  const defaultColumnConfig: ColumnConfig[] = useMemo(
    () => [
      { id: 'code', label: 'Mã HĐ', visible: true, order: 0 },
      { id: 'contract_number', label: 'Số HĐ', visible: true, order: 1 },
      { id: 'collaborator_display', label: 'Cộng tác viên', visible: true, order: 2 },
      { id: 'signed_date', label: 'Ngày ký', visible: true, order: 3 },
      { id: 'fixed_amount', label: 'Giá trị HH', visible: true, order: 4 },
      { id: 'pct_commission', label: '% HH', visible: true, order: 5 },
      { id: 'status', label: 'Trạng thái', visible: true, order: 6 },
    ],
    []
  )

  const {
    columns: columnConfig,
    handleApply,
    handleReset,
  } = useColumnConfig(defaultColumnConfig, {
    storageKey: 'accounting-collaborator-contracts',
  })

  const visibleColumns = useMemo(() => {
    return columnConfig
      .filter((c) => c.visible)
      .sort((a, b) => a.order - b.order)
      .map((c) => allColumns.find((col) => (col as any).accessorKey === c.id || col.id === c.id))
      .filter(Boolean) as ColumnDef<CollaboratorContractList>[]
  }, [columnConfig, allColumns])

  const rowActions: TableAction<CollaboratorContractList>[] = useMemo(() => {
    const actions: TableAction<CollaboratorContractList>[] = []

    if (ability.can('retrieve', 'collaborator_contract')) {
      actions.push({
        label: 'Xem chi tiết',
        icon: <IconEye size={16} />,
        onClick: (record) =>
          navigate(APP_PATH.COLLABORATOR_CONTRACT_DETAIL.replace(':id', String(record.id))),
      })
    }

    if (ability.can('update', 'collaborator_contract')) {
      actions.push({
        label: 'Chỉnh sửa',
        icon: <IconPencilsimple size={16} />,
        onClick: (record) =>
          navigate(APP_PATH.COLLABORATOR_CONTRACT_EDIT.replace(':id', String(record.id))),
      })
    }

    // "Tải PDF" — disabled until backend endpoint is ready
    actions.push({
      label: 'Tải PDF (Sắp ra mắt)',
      icon: <IconDownload size={16} />,
      onClick: () => {
        /* disabled — no endpoint yet */
      },
    })

    if (ability.can('update', 'collaborator_contract')) {
      actions.push({
        label: 'Đánh dấu đã ký',
        icon: <IconCheck size={16} />,
        onClick: (record) => onMarkSigned?.(record),
        show: (record) => record.status === ContractStatus.draft,
      })

      actions.push({
        label: 'Huỷ hợp đồng',
        icon: <IconX size={16} className="text-action-primary-red-default" />,
        variant: 'danger',
        onClick: (record) => onCancel?.(record),
        show: (record) => record.status === ContractStatus.draft,
      })
    }

    return actions
  }, [ability, navigate, onMarkSigned, onCancel])

  if (error) {
    return <TableError />
  }

  return (
    <Table
      columns={visibleColumns}
      data={data}
      isLoading={isLoading}
      pageCount={pageCount}
      pageSize={pageSize}
      currentPageIndex={currentPage - 1}
      totalRecords={totalRecords}
      onPaginationChange={onPaginationChange}
      hasFilter={hasFilter}
      onClearFilter={onClearFilter}
      showSTT
      showActions
      rowActions={rowActions}
      manualPagination
      manualSorting
      disableInnerOverflow={true}
      paginationPosition="static"
      className="flex-1"
      isShowTableColumnConfig={isShowTableColumnConfig}
      columnConfig={columnConfig}
      onColumnConfigApply={handleApply}
      onColumnConfigReset={handleReset}
      stickyHeader
    />
  )
}

export default CollaboratorContractTable
