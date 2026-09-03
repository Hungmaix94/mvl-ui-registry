import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

import { IconEye } from '@/assets/icons'
import { ReferenceCode } from '@/components/commons'
import { Table, type ColumnDef, type TableAction } from '@/components/ui'
import TableError from '@/components/ui/table/TableError'
import { PAGE_SIZE } from '@/constants/table'
import { useAbility } from '@/lib/ability'
import { APP_PATH } from '@/routes'
import { formatCurrencyVND } from '@/utils/common'
import { formatDate } from '@/utils/date-utils'
import { useDealWorkspace } from '@/features/sales/deals/services/deal-service'

import {
  FEE_SUPPORT_ACTION,
  FEE_SUPPORT_PERMISSION_SUBJECT,
} from '../constants/fee-support-request-constants'
import type { FeeSupportRequest } from '../services/fee-support-request-service'
import { bonusCutOf } from '../types/fee-support-request-types'
import { feeSupportProjectName, feeSupportUnitNumber } from '../utils/fee-support-record-display'
import FeeSupportRequestDocumentStatusBadge from './FeeSupportRequestDocumentStatusBadge'
import FeeSupportRequestOriginBadge from './FeeSupportRequestOriginBadge'
import FeeSupportRequestStatusBadge from './FeeSupportRequestStatusBadge'

function FeeSupportProjectCell({ record }: { record: FeeSupportRequest }) {
  const directName = feeSupportProjectName(record)
  const dealId = record.deal ?? 0
  const { data: workspace } = useDealWorkspace(dealId, { enabled: !directName && !!dealId })
  const projectName = directName ?? workspace?.overview?.project?.name ?? '—'
  return <span className="text-content-dark-1 font-medium">{projectName}</span>
}

function FeeSupportUnitCell({ record }: { record: FeeSupportRequest }) {
  const directUnit = feeSupportUnitNumber(record)
  const dealId = record.deal ?? 0
  const { data: workspace } = useDealWorkspace(dealId, { enabled: !directUnit && !!dealId })
  const unitNumber = directUnit ?? workspace?.overview?.product_inventory?.unit_number ?? '—'
  return <span className="text-content-dark-1 font-medium">{unitNumber}</span>
}

/**
 * Kênh hỗ trợ là XOR %/tiền — hiển thị đúng kênh BE trả, không quy đổi (D9/D16).
 */
function renderPctOrAmount(pct?: string | null, amount?: string | null): string {
  if (pct) return `${pct}%`
  if (amount) return formatCurrencyVND(Number(amount))
  return '—'
}

type FeeSupportRequestTableProps = {
  data: FeeSupportRequest[]
  isLoading: boolean
  error?: unknown
  totalRecords?: number
  pageSize?: number
  pageCount?: number
  currentPageIndex?: number
  onPaginationChange?: (pageIndex: number, pageSize: number) => void
  hasFilter?: boolean
  onClearFilter?: () => void
}

const FeeSupportRequestTable = ({
  data,
  isLoading,
  error,
  totalRecords = 0,
  pageSize = PAGE_SIZE,
  pageCount = 0,
  currentPageIndex = 0,
  onPaginationChange,
  hasFilter,
  onClearFilter,
}: FeeSupportRequestTableProps) => {
  const navigate = useNavigate()
  const ability = useAbility()

  const columns: ColumnDef<FeeSupportRequest>[] = useMemo(
    () => [
      {
        accessorKey: 'code',
        header: 'Mã đề xuất',
        cell: ({ row }) => (
          <ReferenceCode
            code={row.original.code}
            linkTo={APP_PATH.FEE_SUPPORT_PROPOSAL_DETAIL.replace(':id', String(row.original.id))}
          />
        ),
        meta: { width: 'w-[170px]', sortable: false },
      },
      {
        id: 'project',
        header: 'Dự án',
        cell: ({ row }) => <FeeSupportProjectCell record={row.original} />,
        meta: { width: 'w-[160px]', sortable: false },
      },
      {
        id: 'unit_number',
        header: 'Mã căn',
        cell: ({ row }) => <FeeSupportUnitCell record={row.original} />,
        meta: { width: 'w-[130px]', sortable: false },
      },
      {
        id: 'deal',
        header: 'Giao dịch',
        // v3: phiếu tạo trước khi duyệt cọc có deal = null (neo hợp đồng cọc).
        cell: ({ row }) =>
          row.original.deal ? (
            <ReferenceCode
              code={`GD #${row.original.deal}`}
              linkTo={APP_PATH.DEAL_DETAIL.replace(':id', String(row.original.deal))}
            />
          ) : (
            <span className="text-content-dark-3">Chờ duyệt cọc</span>
          ),
        meta: { width: 'w-[140px]', sortable: false },
      },
      {
        id: 'origin',
        header: 'Nguồn tạo',
        cell: ({ row }) => <FeeSupportRequestOriginBadge origin={row.original.origin} />,
        meta: { width: 'w-[190px]', sortable: false },
      },
      {
        id: 'support_sale',
        header: 'Hỗ trợ HH sale',
        cell: ({ row }) =>
          renderPctOrAmount(row.original.support_sale_pct, row.original.support_sale_amount),
        meta: { width: 'w-[150px]', sortable: false },
      },
      {
        id: 'support_bonus',
        header: 'Hỗ trợ thưởng',
        cell: ({ row }) =>
          renderPctOrAmount(row.original.support_bonus_pct, row.original.support_bonus_amount),
        meta: { width: 'w-[150px]', sortable: false },
      },
      {
        id: 'customer_discount',
        header: 'Cắt khách (HH)',
        cell: ({ row }) =>
          renderPctOrAmount(
            row.original.customer_discount_pct,
            row.original.customer_discount_amount
          ),
        meta: { width: 'w-[150px]', sortable: false },
      },
      {
        id: 'customer_discount_bonus',
        header: 'Cắt khách (thưởng)',
        cell: ({ row }) => {
          const cut = bonusCutOf(row.original)
          return renderPctOrAmount(cut.pct, cut.amount)
        },
        meta: { width: 'w-[150px]', sortable: false },
      },
      {
        id: 'created_at',
        header: 'Ngày tạo',
        cell: ({ row }) => formatDate(row.original.created_at),
        meta: { width: 'w-[130px]', sortable: false },
      },
      {
        id: 'status',
        header: 'Trạng thái',
        // Nhãn ladder do BE trả dài tới ~28 ký tự ("Chờ Trưởng phòng Admin duyệt") nên cột phải
        // đủ rộng; `whitespace-normal` để chip xuống dòng trong ô thay vì tràn sang cột bên cạnh
        // nếu BE thêm nhãn dài hơn (Chip mặc định `whitespace-nowrap`, `<td>` không cắt tràn).
        cell: ({ row }) => (
          <FeeSupportRequestStatusBadge
            status={row.original.status}
            className="max-w-full text-left whitespace-normal"
          />
        ),
        meta: { width: 'w-[220px]', sortable: false },
      },
      {
        id: 'document_status',
        header: 'Hồ sơ',
        // v3: tuyến kế toán duyệt thủ tục — độc lập với ladder chủ trương.
        cell: ({ row }) => (
          <FeeSupportRequestDocumentStatusBadge
            status={row.original.document_status}
            className="max-w-full text-left whitespace-normal"
          />
        ),
        meta: { width: 'w-[200px]', sortable: false },
      },
    ],
    []
  )

  const actions: TableAction<FeeSupportRequest>[] = [
    {
      label: 'Chi tiết',
      icon: <IconEye />,
      show: () => ability.can(FEE_SUPPORT_ACTION.RETRIEVE, FEE_SUPPORT_PERMISSION_SUBJECT),
      onClick: (record) => {
        navigate(APP_PATH.FEE_SUPPORT_PROPOSAL_DETAIL.replace(':id', String(record.id)))
      },
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

export default FeeSupportRequestTable
