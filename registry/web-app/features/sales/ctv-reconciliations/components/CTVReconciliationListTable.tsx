import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

import { IconEye, IconTrash } from '@/assets/icons'
import { type ColumnDef, Table, type TableAction } from '@/components/ui'
import TableError from '@/components/ui/table/TableError'
import { APP_PATH } from '@/routes'
import { useAbility } from '@/lib/ability'
import { type CTVReconciliationSheetList } from '@/features/sales/ctv-reconciliations/services/ctv-reconciliation-sheet-service'
import CTVReconciliationStatusBadge from './CTVReconciliationStatusBadge'
import {
  renderReconCodeLink,
  renderReconParentSheetLink,
} from '@/features/sales/_shared/reconciliation/recon-code-link'
import { PAGE_SIZE } from '@/constants/table'
import { formatDate } from '@/utils/date-utils'

type CTVReconciliationListTableProps = {
  data: CTVReconciliationSheetList[]
  isLoading: boolean
  error?: unknown
  totalRecords?: number
  pageSize?: number
  pageCount?: number
  currentPageIndex?: number
  onPaginationChange?: (pageIndex: number, pageSize: number) => void
  onDelete?: (row: CTVReconciliationSheetList) => void
  hasFilter?: boolean
  onClearFilter?: () => void
}

const CTVReconciliationListTable = ({
  data,
  isLoading,
  error,
  totalRecords = 0,
  pageSize = PAGE_SIZE,
  pageCount = 0,
  currentPageIndex = 0,
  onPaginationChange,
  onDelete,
  hasFilter,
  onClearFilter,
}: CTVReconciliationListTableProps) => {
  const navigate = useNavigate()
  const ability = useAbility()
  const canViewDetail = ability.can('retrieve', 'ctv_reconciliation')
  // Thiếu quyền xem phiếu CĐT thì cột "Sinh từ" vẫn hiện mã, chỉ bỏ link.
  const canViewInvestorSheet = ability.can('retrieve', 'investor_reconciliation_sheet')

  const columns: ColumnDef<CTVReconciliationSheetList>[] = useMemo(
    () => [
      {
        accessorKey: 'code',
        header: 'Mã đối chiếu',
        cell: ({ row }) => {
          const path = canViewDetail
            ? APP_PATH.CTV_RECONCILIATION_DETAIL.replace(':id', String(row.original.id))
            : null
          return renderReconCodeLink(row.original.code, path)
        },
        meta: { width: 'w-[160px]', sortable: true },
      },
      {
        id: 'investor_sheet',
        header: 'Sinh từ',
        cell: ({ row }) => renderReconParentSheetLink(row.original, canViewInvestorSheet),
        meta: { width: 'w-[160px]', sortable: false },
      },
      {
        id: 'project',
        header: 'Dự án',
        cell: ({ row }) => row.original.project_detail?.name ?? '-',
        meta: { className: 'min-w-[200px]', sortable: false },
      },
      {
        id: 'collaborator',
        header: 'Cộng tác viên',
        cell: ({ row }) => {
          const detail = row.original.collaborator_detail
          if (!detail) return '-'
          const code = detail.code ?? ''
          const name = detail.name ?? ''
          const label = `${code} - ${name}`.replace(/^- | -$/g, '')
          return label || '-'
        },
        meta: { width: 'w-[220px]', sortable: false },
      },
      {
        id: 'tax_code',
        header: 'Mã số thuế',
        // TODO(FA-6996): Remove `as any` once backend is deployed and schema.ts is regenerated with `tax_code`.
        cell: ({ row }) => (row.original.collaborator_detail as any)?.tax_code || '-',
        meta: { width: 'w-[140px]', sortable: false },
      },
      {
        id: 'sales_allocation',
        header: 'Phân lô',
        cell: ({ row }) => row.original.sales_allocation_detail?.code ?? '-',
        meta: { width: 'w-[160px]', sortable: false },
      },
      {
        accessorKey: 'reconciliation_date',
        header: 'Ngày đối chiếu',
        cell: ({ row }) =>
          row.original.reconciliation_date ? formatDate(row.original.reconciliation_date) : '-',
        meta: { width: 'w-[140px]', sortable: true },
      },
      {
        id: 'status',
        header: 'Trạng thái',
        cell: ({ row }) =>
          row.original.status && <CTVReconciliationStatusBadge status={row.original.status} />,
        meta: { width: 'flex-1', sortable: false },
      },
    ],
    [canViewDetail, canViewInvestorSheet]
  )

  // Màn đối chiếu CTV CHỈ XEM (không còn edit) — bỏ "Chỉnh sửa"; giữ "Chi tiết" + "Xóa".
  const actions: TableAction<CTVReconciliationSheetList>[] = [
    {
      label: 'Chi tiết',
      icon: <IconEye />,
      show: () => ability.can('retrieve', 'ctv_reconciliation'),
      onClick: (record) => {
        navigate(APP_PATH.CTV_RECONCILIATION_DETAIL.replace(':id', record.id.toString()))
      },
    },
    {
      label: 'Xóa',
      icon: <IconTrash />,
      show: () => ability.can('destroy', 'ctv_reconciliation'),
      onClick: (record) => onDelete?.(record),
      variant: 'danger',
    },
  ]

  if (error) {
    return <TableError />
  }

  return (
    <Table
      columns={columns}
      data={data}
      isLoading={isLoading}
      showActions
      rowActions={actions}
      totalRecords={totalRecords}
      pageSize={pageSize}
      pageCount={pageCount}
      manualPagination={true}
      currentPageIndex={currentPageIndex}
      onPaginationChange={onPaginationChange}
      disableInnerOverflow={true}
      paginationPosition="static"
      stickyHeader
      className={'px-7'}
      hasFilter={hasFilter}
      onClearFilter={onClearFilter}
      emptyMessage="Không có dữ liệu"
    />
  )
}

export default CTVReconciliationListTable
