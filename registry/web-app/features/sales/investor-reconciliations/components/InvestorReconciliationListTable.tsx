import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { IconCheckcircle, IconEye, IconPencilsimple, IconTrash } from '@/assets/icons'
import { type ColumnDef, Table, type TableAction } from '@/components/ui'
import TableError from '@/components/ui/table/TableError'
import { APP_PATH } from '@/routes'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import useAppConstant from '@/hooks/useAppConstant'
import { useAbility } from '@/lib/ability'
import type { InvestorReconciliationSheet } from '@/features/sales/investor-reconciliations/types/investor-reconciliation'
import InvestorReconciliationStatusBadge from '@/features/sales/_shared/reconciliation/InvestorReconciliationStatusBadge'
import { renderReconCodeLink } from '@/features/sales/_shared/reconciliation/recon-code-link'
import { PAGE_SIZE } from '@/constants/table'
import { formatDate } from '@/utils/date-utils'
import { formatCurrencyVND } from '@/utils/common'
import { formatSummaryCurrency } from '@/utils/table/summary'
import type { InvestorReconciliationSheetListSummary } from '@/features/sales/investor-reconciliations/services/investor-reconciliation-service'
import {
  ReconciliationSourceType as ReconSourceType,
  ReconciliationStatus,
} from '@/constants/api-schema-aliases'

// Hiển thị nhãn dạng link mở tab mới khi có path (đã pass quyền + có id),
// ngược lại chỉ hiển thị text thường.
const renderDetailLink = (label: string, path: string | null) =>
  path ? (
    <Link
      to={path}
      target="_blank"
      rel="noopener noreferrer"
      className="text-action-primary-default font-medium hover:underline"
      onClick={(e) => e.stopPropagation()}
    >
      {label}
    </Link>
  ) : (
    <span>{label}</span>
  )

type InvestorReconciliationListTableProps = {
  data: InvestorReconciliationSheet[]
  isLoading: boolean
  error?: unknown
  totalRecords?: number
  pageSize?: number
  pageCount?: number
  currentPageIndex?: number
  onPaginationChange?: (pageIndex: number, pageSize: number) => void
  onDelete?: (row: InvestorReconciliationSheet) => void
  onConfirm?: (row: InvestorReconciliationSheet) => void
  /**
   * Tổng "Thành tiền (gồm VAT)" của TOÀN BỘ kết quả lọc, do BE trả cạnh `results` (CR 86eymqdfk).
   *
   * `undefined` khi response chưa có khối này ⇒ dòng tổng hiện `—`. **Không được cộng tay các dòng
   * đang hiển thị để lấp chỗ trống**: bảng chỉ giữ một trang (mặc định 25 dòng) của một tập lọc có
   * thể lên tới hàng nghìn phiếu — đo 18/08 là 1469 phiếu, tổng thật 71,2 tỷ trong khi 25 dòng
   * trang đầu chỉ cộng ra 4,4 tỷ. Con số cộng tay đó nhỏ hơn sự thật gần 17 lần mà vẫn trông hoàn
   * toàn hợp lý trên màn hình, nên không có gì để người dùng nghi ngờ.
   */
  summary?: InvestorReconciliationSheetListSummary
  /**
   * Route overrides — lets the 2.0 list reuse this table but link into the 2.0 screens.
   * Both default to the canonical paths (= the 2.0 screens post-cutover). `editPathTemplate`
   * points at DETAIL on purpose: there is no edit route any more (2.0 edits the meta inline).
   */
  detailPathTemplate?: string
  editPathTemplate?: string
}

const InvestorReconciliationListTable = ({
  data,
  isLoading,
  error,
  totalRecords = 0,
  pageSize = PAGE_SIZE,
  pageCount = 0,
  currentPageIndex = 0,
  onPaginationChange,
  onDelete,
  onConfirm,
  summary,
  detailPathTemplate = APP_PATH.INVESTOR_RECONCILIATION_DETAIL,
  editPathTemplate = APP_PATH.INVESTOR_RECONCILIATION_DETAIL,
}: InvestorReconciliationListTableProps) => {
  const navigate = useNavigate()
  const ability = useAbility()

  const { keysMap } = useAppConstant({
    module: 'sales',
    keys: [APP_CONSTANT_KEY.SALES.INVESTOR_RECONCILIATION_SHEET.SOURCE_TYPE_CHOICES],
  })

  const sourceTypeLabels = keysMap.get(
    APP_CONSTANT_KEY.SALES.INVESTOR_RECONCILIATION_SHEET.SOURCE_TYPE_CHOICES
  ) as Record<string, string> | undefined

  // Quyền xem chi tiết của từng đối tượng được link tới — chỉ cho phép bấm khi có quyền.
  const canViewProject = ability.can('retrieve', 'project')
  const canViewInvestor = ability.can('retrieve', 'investor')
  const canViewExchange = ability.can('retrieve', 'exchange')
  const canViewDetail = ability.can('retrieve', 'investor_reconciliation_sheet')

  const columns: ColumnDef<InvestorReconciliationSheet>[] = useMemo(
    () => [
      {
        accessorKey: 'code',
        header: 'Mã đối chiếu',
        cell: ({ row }) => {
          const path = canViewDetail
            ? detailPathTemplate.replace(':id', String(row.original.id))
            : null
          return renderReconCodeLink(row.original.code, path)
        },
        meta: { width: 'w-[150px]', sortable: true },
      },
      {
        id: 'project',
        header: 'Dự án',
        cell: ({ row }) => {
          const project = row.original.project_detail
          if (!project?.name) return '-'
          const path =
            canViewProject && project.id
              ? APP_PATH.PROJECT_MANAGEMENT_DETAIL.replace(':id', String(project.id))
              : null
          return renderDetailLink(project.name, path)
        },
        meta: { className: 'min-w-[200px]', sortable: false },
      },
      {
        id: 'source_type',
        header: 'Loại nguồn',
        cell: ({ row }) =>
          sourceTypeLabels?.[row.original.source_type] ?? row.original.source_type ?? '-',
        // "Trực tiếp từ Chủ đầu tư" là nhãn dài nhất; 150px cho nó xuống 2 dòng gọn thay vì
        // giữ 160px chỉ để phục vụ một nhãn.
        meta: { width: 'w-[150px]', sortable: false },
      },
      {
        id: 'source_exchange_detail',
        header: 'Nguồn hàng/CĐT',
        // Nguồn "Trực tiếp từ CĐT" (direct) lấy thông tin từ investor_detail,
        // nguồn "Qua sàn F0" lấy từ source_exchange_detail — mỗi loại nguồn
        // chỉ điền 1 trong 2 field nên phải chọn theo source_type.
        cell: ({ row }) => {
          const isDirect = row.original.source_type === ReconSourceType.direct
          const source = isDirect
            ? row.original.investor_detail
            : row.original.source_exchange_detail
          const parts = [source?.code, source?.name].filter(Boolean)
          if (!parts.length) return '-'
          const label = parts.join(' - ')
          // CĐT → màn quản lý chủ đầu tư; sàn F0 → màn quản lý sàn nguồn (F0).
          const canView = isDirect ? canViewInvestor : canViewExchange
          const pathTemplate = isDirect
            ? APP_PATH.INVESTOR_MANAGEMENT_DETAIL
            : APP_PATH.SOURCE_EXCHANGE_MANAGEMENT_DETAIL
          const path = canView && source?.id ? pathTemplate.replace(':id', String(source.id)) : null
          return renderDetailLink(label, path)
        },
        meta: { width: 'w-[200px]', sortable: false },
      },
      {
        accessorKey: 'reconciliation_date',
        header: 'Ngày đối chiếu',
        cell: ({ row }) =>
          row.original.reconciliation_date ? formatDate(row.original.reconciliation_date) : '-',
        // dd/MM/yyyy chỉ ~81px; 130px là đủ cho tiêu đề, phần thừa cắt bớt.
        meta: { width: 'w-[130px]', sortable: true },
      },
      {
        // Số của CẢ phiếu (Σ các căn chưa huỷ), lấy thẳng từ BE — cùng con số màn chi tiết hiện ở
        // "Tổng (gồm VAT)". `footer` là tổng toàn bộ bộ lọc, không phải tổng trang đang xem.
        //
        // Đứng TRƯỚC "Trạng thái" và ghim mép phải cùng nó (chốt với user 18/08) — giữ hai màn
        // CĐT/F2 đọc giống nhau, và ghim thì khung có hẹp lại (sidebar mở) vẫn thấy tiền.
        id: 'total_amount_with_vat',
        header: 'Thành tiền (gồm VAT)',
        cell: ({ row }) => {
          const value = row.original.total_amount_with_vat
          // Truyền thẳng chuỗi decimal của BE: `formatCurrencyVND` đã trả '-' cho null/''/NaN.
          // Bọc `Number()` trước sẽ biến chuỗi rỗng thành 0 và in ra "0" — tức bịa một con số.
          return value != null ? (
            <span className="whitespace-nowrap">{formatCurrencyVND(value)}</span>
          ) : (
            '-'
          )
        },
        footer: () => formatSummaryCurrency(summary?.total_amount_with_vat),
        // 150px thay vì 200px: ô số rộng nhất đo được 85px, tiêu đề tự xuống 2 dòng.
        meta: { align: 'right', width: 'w-[150px]', sortable: false, frozenRight: true },
      },
      {
        id: 'status',
        header: 'Trạng thái',
        cell: ({ row }) =>
          row.original.status && <InvestorReconciliationStatusBadge status={row.original.status} />,
        // Bề rộng xác định thay cho `flex-1`: cột sticky cần biết bề rộng để tính offset ghim,
        // và `flex-1` ở cột áp chót còn kéo giãn bảng ra cho đủ khung — chính thứ làm bảng thưa.
        meta: { width: 'w-[120px]', frozenRight: true },
      },
    ],
    [
      sourceTypeLabels,
      canViewProject,
      canViewInvestor,
      canViewExchange,
      canViewDetail,
      detailPathTemplate,
      summary,
    ]
  )

  const actions: TableAction<InvestorReconciliationSheet>[] = [
    {
      label: 'Chi tiết',
      icon: <IconEye />,
      show: () => ability.can('retrieve', 'investor_reconciliation_sheet'),
      onClick: (record) => {
        navigate(detailPathTemplate.replace(':id', record.id.toString()))
      },
    },
    {
      label: 'Phê duyệt',
      icon: <IconCheckcircle />,
      show: (row) =>
        ability.can('confirm', 'investor_reconciliation_sheet') &&
        row.status === ReconciliationStatus.draft,
      onClick: (record) => onConfirm?.(record),
    },
    {
      label: 'Chỉnh sửa',
      icon: <IconPencilsimple />,
      onClick: (record) => {
        navigate(editPathTemplate.replace(':id', record.id.toString()))
      },
      // Chỉ phiếu ở trạng thái Đang lập (draft) mới sửa được — phiếu đã phê duyệt/hủy ẩn action này
      // (đồng bộ với detail page + BE chỉ cho PUT khi draft).
      show: (row) =>
        ability.can('update', 'investor_reconciliation_sheet') &&
        row.status === ReconciliationStatus.draft,
    },
    {
      label: 'Xóa',
      icon: <IconTrash />,
      // Ẩn Xóa với phiếu Đã xác nhận (confirmed) — chỉ cho xóa phiếu chưa xác nhận.
      show: (row) =>
        ability.can('destroy', 'investor_reconciliation_sheet') &&
        row.status !== ReconciliationStatus.confirmed,
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
      showSummaryRow
      summaryRowCount={totalRecords}
      className={'px-7'}
      stickyHeader
    />
  )
}

export default InvestorReconciliationListTable
