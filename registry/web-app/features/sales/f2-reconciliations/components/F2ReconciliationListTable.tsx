import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

import { IconEye } from '@/assets/icons'
import type { ColumnDef, TableAction } from '@/components/ui'
import { Table } from '@/components/ui'
import TableError from '@/components/ui/table/TableError'
import { APP_PATH } from '@/routes'
import { PAGE_SIZE } from '@/constants/table'
import { formatDate } from '@/utils/date-utils'
import { formatCurrencyVND } from '@/utils/common'
import { formatSummaryCurrency } from '@/utils/table/summary'
import type { F2ReconciliationSheetListSummary } from '@/features/sales/f2-reconciliations/services/f2-reconciliation-service'
import { useAbility } from '@/lib/ability'
import { F2ReconciliationStatusBadge } from './F2ReconciliationStatusBadge'
import type { F2ReconciliationSheet } from '@/features/sales/f2-reconciliations/types/f2-reconciliation'
import {
  renderReconCodeLink,
  renderReconParentSheetLink,
} from '@/features/sales/_shared/reconciliation/recon-code-link'

type Props = {
  data: F2ReconciliationSheet[]
  isLoading: boolean
  error?: unknown
  totalRecords?: number
  pageSize?: number
  pageCount?: number
  currentPageIndex?: number
  onPaginationChange?: (pageIndex: number, pageSize: number) => void
  /**
   * Tổng "Thành tiền (gồm VAT)" của TOÀN BỘ kết quả lọc (CR 86eymqdfk) — xem ghi chú cùng tên ở
   * `InvestorReconciliationListTable`. `undefined` ⇒ dòng tổng hiện `—`, không cộng tay các dòng.
   */
  summary?: F2ReconciliationSheetListSummary
}

const F2ReconciliationListTable = ({
  data,
  isLoading,
  error,
  totalRecords = 0,
  pageSize = PAGE_SIZE,
  pageCount = 0,
  currentPageIndex = 0,
  onPaginationChange,
  summary,
}: Props) => {
  const navigate = useNavigate()
  const ability = useAbility()
  const canViewDetail = ability.can('retrieve', 'f2_reconciliation_sheet')
  // Thiếu quyền xem phiếu CĐT thì cột "Sinh từ" vẫn hiện mã, chỉ bỏ link.
  const canViewInvestorSheet = ability.can('retrieve', 'investor_reconciliation_sheet')

  const columns = useMemo<ColumnDef<F2ReconciliationSheet>[]>(
    () => [
      {
        accessorKey: 'code',
        header: 'Mã đối chiếu',
        cell: ({ row }) => {
          const path = canViewDetail
            ? APP_PATH.F2_RECONCILIATION_DETAIL.replace(':id', String(row.original.id))
            : null
          return renderReconCodeLink(row.original.code, path)
        },
        meta: { width: 'w-[150px]', sortable: true },
      },
      {
        id: 'investor_sheet',
        header: 'Sinh từ',
        cell: ({ row }) => renderReconParentSheetLink(row.original, canViewInvestorSheet),
        // Mã phiếu cha đo 115px + padding 24px.
        meta: { width: 'w-[140px]', sortable: false },
      },
      {
        id: 'project',
        header: 'Dự án',
        cell: ({ row }) => row.original.project_detail?.name ?? '-',
        // Tên dự án dài hơn mọi bề rộng hợp lý (đo 227px) nên vốn đã xuống dòng — thu 10px
        // không đổi số dòng nhưng trả chỗ cho cả bảng nằm gọn trong khung.
        meta: { width: 'w-[190px]', sortable: false },
      },
      {
        id: 'exchange',
        header: 'Sàn giao dịch',
        cell: ({ row }) => {
          const code = row.original.exchange_detail?.code
          const name = row.original.exchange_detail?.name
          if (!code && !name) return '-'
          if (!code) return name ?? '-'
          if (!name) return code
          return `${code} - ${name}`
        },
        // Như cột Dự án: chuỗi "mã - tên sàn" đo 285px, luôn xuống dòng dù để 220px.
        meta: { width: 'w-[190px]', sortable: false },
      },
      {
        id: 'tax_code',
        header: 'Mã số thuế',
        cell: ({ row }) => row.original.exchange_detail?.tax_code || '-',
        // MST dài nhất đo được 88px — 140px cũ để thừa ~50px mỗi dòng.
        meta: { width: 'w-[120px]', sortable: false },
      },
      {
        accessorKey: 'reconciliation_date',
        header: 'Ngày đối chiếu',
        cell: ({ row }) =>
          row.original.reconciliation_date ? formatDate(row.original.reconciliation_date) : '-',
        // dd/MM/yyyy đo 81px, tiêu đề 99px — 130px là vừa cho tiêu đề, không phải cho ô.
        meta: { width: 'w-[130px]', sortable: true },
      },
      {
        // Xem ghi chú ở cột cùng tên bên `InvestorReconciliationListTable`.
        // Đứng TRƯỚC "Trạng thái" (chốt với user 18/08): tiền là thứ người đọc bảng tìm trước,
        // và đặt cạnh "Ngày đối chiếu" thì cụm ngày–tiền–trạng thái đọc thành một mạch.
        id: 'total_amount_with_vat',
        header: 'Thành tiền (gồm VAT)',
        cell: ({ row }) => {
          const value = row.original.total_amount_with_vat
          return value != null ? (
            <span className="whitespace-nowrap">{formatCurrencyVND(value)}</span>
          ) : (
            '-'
          )
        },
        footer: () => formatSummaryCurrency(summary?.total_amount_with_vat),
        // 150px: số dài nhất đo được là 85px và tổng ở chân bảng ~100px, cộng padding vừa đủ.
        // Tiêu đề dài hơn ô số nên nó tự xuống 2 dòng — chấp nhận, vì lấy 200px cho vừa MỘT dòng
        // tiêu đề thì mọi ô số bên dưới thừa hơn 100px và bảng đọc ra rất thưa.
        meta: { align: 'right', width: 'w-[150px]', sortable: false, frozenRight: true },
      },
      {
        id: 'status',
        header: 'Trạng thái',
        cell: ({ row }) =>
          row.original.status ? <F2ReconciliationStatusBadge status={row.original.status} /> : '-',
        // Ghim cùng cột tiền: khi khung hẹp (sidebar mở) bảng vẫn rộng hơn viewport, và hai cột
        // người dùng cần liếc nhanh nhất là "phiếu bao nhiêu tiền" + "phiếu đã duyệt chưa".
        // Bỏ `flex-1` vì cột sticky phải có bề rộng xác định để tính offset ghim.
        meta: { width: 'w-[120px]', sortable: false, frozenRight: true },
      },
    ],
    [canViewDetail, canViewInvestorSheet, summary]
  )

  // Màn đối chiếu F2 CHỈ XEM (không còn edit) — chỉ còn thao tác "Chi tiết".
  const actions: TableAction<F2ReconciliationSheet>[] = [
    {
      label: 'Chi tiết',
      icon: <IconEye />,
      show: () => ability.can('retrieve', 'f2_reconciliation_sheet'),
      onClick: (record) => {
        navigate(APP_PATH.F2_RECONCILIATION_DETAIL.replace(':id', record.id.toString()))
      },
    },
  ]

  if (error) {
    return <TableError />
  }

  const handlePaginationChange = (pageIndex: number, newPageSize: number) => {
    onPaginationChange?.(pageIndex, newPageSize)
  }

  return (
    <Table
      columns={columns}
      data={data}
      isLoading={isLoading}
      totalRecords={totalRecords}
      pageSize={pageSize}
      manualPagination={true}
      currentPageIndex={currentPageIndex}
      showSTT={true}
      showActions={true}
      rowActions={actions}
      pageCount={pageCount}
      onPaginationChange={handlePaginationChange}
      disableInnerOverflow
      paginationPosition="static"
      stickyHeader
      showSummaryRow
      summaryRowCount={totalRecords}
      className="px-7"
    />
  )
}

export default F2ReconciliationListTable
