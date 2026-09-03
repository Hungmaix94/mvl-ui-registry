import { useMemo, useCallback } from 'react'
import { formatSummaryCurrency } from '@/utils/table/summary'
import { useNavigate } from 'react-router-dom'
import type { ColumnDef, SortingState } from '@tanstack/react-table'
import { Table } from '@/components/ui'
import TableError from '@/components/ui/table/TableError'
import { IconEye, IconTrash, IconCheck, IconPencilsimple } from '@/assets/icons'
import { APP_PATH } from '@/routes'
import { PAGE_SIZE } from '@/constants/table'
import { formatDate } from '@/utils/date-utils'
import { formatCurrencyVND, formatPctFloor } from '@/utils/common'
import { useAbility } from '@/lib/ability'
import type { SalesInvoice } from '@/features/accounting/sales-invoices/services/sales-invoice-service'
import type { SalesInvoiceSummary } from '@/features/accounting/sales-invoices/services/sales-invoice-service'
import { useDeleteSalesInvoice } from '@/features/accounting/sales-invoices/services/sales-invoice-service'
import { SalesInvoiceStatusBadge } from './SalesInvoiceStatusBadge'
import type { TableAction } from '@/types/table'
import { ReferenceCode } from '@/components/commons'
import { useDialog } from '@/hooks/useDialog'
import { useInvalidateQueries } from '@/hooks/useApiQuery'
import toastService from '@/services/toast-service'
import { useColumnConfig } from '@/hooks/useColumnConfig'
import type { ColumnConfig } from '@/types/table'
import { SalesInvoiceStatus as SalesInvoiceStatus } from '@/constants/api-schema-aliases'

/**
 * Cột nào sort được là do **BE quyết**: `GET /accounting/sales-invoices/` chỉ nhận `ordering`
 * theo `invoice_date`, `status`, `total_amount`. Bật `sortable` cho cột ngoài danh sách này thì
 * người dùng bấm mà server không đổi thứ tự — tệ hơn là không cho bấm.
 *
 * Map từ **id cột** sang **field ordering** vì hai bên không trùng tên: cột "Tiền hàng" mang id
 * `amount_before_tax` (id này đã nằm trong config cột người dùng lưu ở localStorage, đổi id là
 * mất cấu hình ẩn/hiện của họ), còn field BE là `total_amount`.
 */
const ORDERING_FIELD_BY_COLUMN_ID: Record<string, string> = {
  invoice_date: 'invoice_date',
  amount_before_tax: 'total_amount',
  status: 'status',
}

const COLUMN_ID_BY_ORDERING_FIELD: Record<string, string> = Object.fromEntries(
  Object.entries(ORDERING_FIELD_BY_COLUMN_ID).map(([columnId, field]) => [field, columnId])
)

type Props = {
  data: SalesInvoice[]
  isLoading: boolean
  error?: unknown
  totalRecords?: number
  pageSize?: number
  pageCount?: number
  currentPageIndex?: number
  onPaginationChange?: (pageIndex: number, pageSize: number) => void
  onIssue?: (record: SalesInvoice) => void
  onVoid?: (record: SalesInvoice) => void
  onAdjust?: (record: SalesInvoice) => void
  onDeleteSuccess?: () => void
  isShowTableColumnConfig?: boolean
  /**
   * Column totals over the WHOLE filtered set, from the `/summary/` sibling endpoint. Never
   * summed from `data` — that is one page, and its sum would read as the filter's total.
   */
  summary?: SalesInvoiceSummary
  /** Rows behind `summary`, shown next to the "TỔNG CỘNG" label. */
  summaryRowCount?: number
  /** `ordering` hiện hành lấy từ URL (có tiền tố `-` khi giảm dần) — để tô mũi tên đúng cột. */
  ordering?: string
  /** Nhận **field của BE**, không phải id cột. Trang cha đẩy thẳng vào `ordering` trên URL. */
  onSortingChange?: (field: string, direction: 'asc' | 'desc' | null) => void
}

const SalesInvoiceTable = ({
  data,
  isLoading,
  error,
  totalRecords = 0,
  pageSize = PAGE_SIZE,
  pageCount = 0,
  currentPageIndex = 0,
  onPaginationChange,
  onIssue,
  onVoid,
  onAdjust,
  onDeleteSuccess,
  isShowTableColumnConfig,
  summary,
  summaryRowCount,
  ordering,
  onSortingChange,
}: Props) => {
  const navigate = useNavigate()
  const ability = useAbility()
  const { displayConfirm } = useDialog()
  const deleteMutation = useDeleteSalesInvoice()
  const invalidateQueries = useInvalidateQueries()

  const handleDelete = useCallback(
    (record: SalesInvoice) => {
      displayConfirm({
        title: 'Xác nhận xóa hóa đơn',
        content: (
          <div className="text-content-dark-2">
            Bạn có chắc chắn muốn xóa hóa đơn này?
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
            toastService.success('Xóa hóa đơn bán ra thành công')
            await invalidateQueries.invalidateByPrefix('accounting/sales-invoices')
            onDeleteSuccess?.()
          } catch {
            // Error handled by service layer
          }
        },
      })
    },
    [displayConfirm, deleteMutation, invalidateQueries, onDeleteSuccess]
  )

  const allColumns = useMemo<ColumnDef<SalesInvoice>[]>(
    () => [
      {
        accessorKey: 'external_invoice_no',
        header: 'Mã HĐ',
        cell: ({ row }) => {
          const code = row.original.external_invoice_no || row.original.code
          return (
            <ReferenceCode
              code={code}
              linkTo={APP_PATH.SALES_INVOICE_DETAIL.replace(':id', row.original.id.toString())}
            />
          )
        },
        // BE không cho `ordering=external_invoice_no` → không dựng nút sort ở đây.
        meta: { width: 'w-[150px]', sortable: false, frozen: true },
      },
      {
        accessorKey: 'invoice_date',
        header: 'Ngày',
        cell: ({ row }) =>
          row.original.invoice_date ? formatDate(row.original.invoice_date) : '-',
        meta: { width: 'w-[120px]', sortable: true },
      },
      {
        accessorKey: 'customer_name',
        header: 'Người mua (CĐT)',
        cell: ({ row }) => {
          const investorId = row.original.investor
          return row.original.customer_name ? (
            investorId ? (
              <span
                className="text-brand-primary-default cursor-pointer font-normal hover:underline"
                onClick={(e) => {
                  e.stopPropagation()
                  navigate(
                    APP_PATH.INVESTOR_MANAGEMENT_DETAIL.replace(':id', investorId.toString())
                  )
                }}
              >
                {row.original.customer_name}
              </span>
            ) : (
              <span className="font-normal text-gray-900">{row.original.customer_name}</span>
            )
          ) : (
            <span className="text-gray-400">—</span>
          )
        },
        meta: { width: 'w-[240px]', sortable: false },
      },
      {
        id: 'reconciliation',
        header: 'Đối chiếu',
        // In MÃ phiếu (IRS…), không phải "#<id>". Con số id là khoá nội bộ, không tra cứu được ở
        // đâu khác; kế toán đối chiếu bằng mã. File Excel xuất ra vốn ĐÃ in mã (`_sheet_code` ở
        // BE) nên trước CR này màn hình và file lệch nhau — đây là đưa màn hình về khớp với file.
        // Link vẫn đi theo id vì route chi tiết nhận id.
        cell: ({ row }) => {
          const reconId = row.original.investor_reconciliation_sheet
          const reconCode = row.original.investor_reconciliation_sheet_code
          return (
            <ReferenceCode
              code={reconCode || null}
              fallback="—"
              linkTo={
                reconId
                  ? APP_PATH.INVESTOR_RECONCILIATION_DETAIL.replace(':id', String(reconId))
                  : undefined
              }
            />
          )
        },
        meta: { width: 'w-[150px]', sortable: false },
      },
      {
        // Dự án của hoá đơn, BE lấy qua phiếu đối chiếu (1 phiếu = 1 dự án) — xem
        // `SalesInvoiceSerializer.project_name`. Đặt cạnh "Đối chiếu" vì đó là nguồn của nó.
        // `—` khi hoá đơn không gắn phiếu đối chiếu: khi đó không dòng nào có dự án để hiện.
        accessorKey: 'project_name',
        header: 'Dự án',
        cell: ({ row }) =>
          row.original.project_name ? (
            <span className="font-normal text-gray-900">{row.original.project_name}</span>
          ) : (
            <span className="text-gray-400">—</span>
          ),
        // BE chỉ nhận `ordering` theo invoice_date/status/total_amount → không dựng nút sort.
        meta: { width: 'w-[200px]', sortable: false },
      },
      {
        // `accessorKey` là BẮT BUỘC để sort được: TanStack tắt `getCanSort()` cho cột không có
        // accessorFn. `id` giữ nguyên `amount_before_tax` vì config cột người dùng đã lưu theo id đó.
        accessorKey: 'total_amount',
        id: 'amount_before_tax',
        header: 'Tiền hàng',
        cell: ({ row }) => {
          const amountBeforeTax = Number(row.original.total_amount || 0)
          return (
            <span className="font-medium text-gray-900">{formatCurrencyVND(amountBeforeTax)}</span>
          )
        },
        footer: () => formatSummaryCurrency(summary?.summary.total_amount),
        // Sort được: id cột `amount_before_tax` map sang field `total_amount` của BE.
        meta: { width: 'w-[140px]', sortable: true, align: 'right' },
      },
      {
        id: 'tax_amount',
        header: 'Thuế VAT',
        cell: ({ row }) => {
          const taxAmount = Math.round(Number(row.original.vat_amount || 0))
          return <span className="font-medium text-gray-900">{formatCurrencyVND(taxAmount)}</span>
        },
        footer: () => formatSummaryCurrency(summary?.summary.vat_amount),
        meta: { width: 'w-[130px]', sortable: false, align: 'right' },
      },
      {
        accessorKey: 'total_amount_with_vat',
        header: 'Tổng cộng',
        cell: ({ row }) =>
          row.original.total_amount_with_vat ? (
            <span className="font-semibold text-gray-900">
              {formatCurrencyVND(Math.round(Number(row.original.total_amount_with_vat)))}
            </span>
          ) : (
            '0'
          ),
        footer: () => formatSummaryCurrency(summary?.summary.total_amount_with_vat),
        // BE chỉ sort được `total_amount` (chưa VAT) — sort cột gồm VAT là nút chết.
        meta: { width: 'w-[160px]', sortable: false, align: 'right' },
      },
      /**
       * CR STT4 — 3 cột tiến độ thu tiền. Cả ba là số của BE, FE KHÔNG tự tính:
       * `paid_amount` gộp ở cấp hóa đơn từ nhiều phiếu thu, còn `collected_pct` /
       * `remaining_to_collect` mang quy tắc làm tròn + clamp riêng của BE.
       */
      {
        accessorKey: 'paid_amount',
        header: 'Số tiền đã thu',
        // Σ allocated_amount của các phiếu thu đã GHI SỔ (POSTED); phiếu CANCELLED được revert.
        cell: ({ row }) => (
          <span className="font-medium text-gray-900">
            {formatCurrencyVND(Math.round(Number(row.original.paid_amount || 0)))}
          </span>
        ),
        footer: () => formatSummaryCurrency(summary?.summary.paid_amount),
        meta: { width: 'w-[150px]', sortable: false, align: 'right' },
      },
      {
        accessorKey: 'collected_pct',
        header: 'Tỷ lệ tiền về',
        // RC.10: paid_amount / total_amount_with_vat. BE trả null khi gross = 0 → hiện '—'.
        // formatPctFloor: % thu phải làm tròn XUỐNG cho khớp ROUND_DOWN của BE (xem utils/common).
        cell: ({ row }) => (
          <span className="font-medium text-gray-900">
            {formatPctFloor(row.original.collected_pct, 2)}
          </span>
        ),
        // Không có footer: `/summary/` cố ý không trả key phần trăm — cộng một tỷ lệ là vô nghĩa.
        meta: { width: 'w-[130px]', sortable: false, align: 'right' },
      },
      {
        accessorKey: 'remaining_to_collect',
        header: 'Số tiền còn lại',
        /**
         * `remaining_to_collect` = amount_to_collect − paid_amount, clamp ≥ 0 theo TỪNG hóa đơn.
         * Từ 2026-08-03 `amount_to_collect` trả thẳng `total_amount_with_vat` (bỏ trừ
         * `prepaid_advance_amount`), nên đây đúng là "Tổng tiền hóa đơn − đã thu" mà CR yêu cầu.
         *
         * KHÔNG dùng `remaining_amount`: field đó là RC.8 — "HĐ ra − Σ HĐ vào đã nối
         * (input_invoices)", tức phần chưa cấn trừ hóa đơn đầu vào F2, không liên quan tiền thu.
         * Hai field tên na ná nhau và cùng ra một con số tiền hợp lý, nên dùng nhầm rất khó bắt.
         */
        cell: ({ row }) => (
          <span className="font-semibold text-gray-900">
            {formatCurrencyVND(Math.round(Number(row.original.remaining_to_collect || 0)))}
          </span>
        ),
        footer: () => formatSummaryCurrency(summary?.summary.remaining_to_collect),
        meta: { width: 'w-[150px]', sortable: false, align: 'right' },
      },
      {
        // Cần `accessorKey` (không phải `id` trần) thì `getCanSort()` mới bật — xem cột "Tiền hàng".
        accessorKey: 'status',
        header: 'Trạng thái',
        cell: ({ row }) =>
          row.original.status ? <SalesInvoiceStatusBadge status={row.original.status} /> : '-',
        meta: { width: 'w-[150px]', sortable: true },
      },
    ],
    [navigate, summary]
  )

  const defaultColumnConfig: ColumnConfig[] = useMemo(
    () => [
      { id: 'external_invoice_no', label: 'Mã HĐ', visible: true, order: 0 },
      { id: 'invoice_date', label: 'Ngày', visible: true, order: 1 },
      { id: 'customer_name', label: 'Người mua (CĐT)', visible: true, order: 2 },
      { id: 'reconciliation', label: 'Đối chiếu', visible: true, order: 3 },
      { id: 'project_name', label: 'Dự án', visible: true, order: 4 },
      { id: 'amount_before_tax', label: 'Tiền hàng', visible: true, order: 5 },
      { id: 'tax_amount', label: 'Thuế VAT', visible: true, order: 6 },
      { id: 'total_amount_with_vat', label: 'Tổng cộng', visible: true, order: 7 },
      { id: 'paid_amount', label: 'Số tiền đã thu', visible: true, order: 8 },
      { id: 'collected_pct', label: 'Tỷ lệ tiền về', visible: true, order: 9 },
      { id: 'remaining_to_collect', label: 'Số tiền còn lại', visible: true, order: 10 },
      { id: 'status', label: 'Trạng thái', visible: true, order: 11 },
    ],
    []
  )

  const {
    columns: columnConfig,
    handleApply,
    handleReset,
  } = useColumnConfig(defaultColumnConfig, {
    storageKey: 'accounting-sales-invoices',
  })

  /** `ordering` trên URL → mũi tên trên header. `-field` = giảm dần. */
  const sortingState = useMemo<SortingState>(() => {
    const field = ordering?.split(',')[0]?.trim()
    if (!field) return []
    const desc = field.startsWith('-')
    const columnId = COLUMN_ID_BY_ORDERING_FIELD[desc ? field.slice(1) : field]
    return columnId ? [{ id: columnId, desc }] : []
  }, [ordering])

  /** `Table` phát ra **id cột**; dịch sang field BE trước khi trả cho trang cha. */
  const handleSortingChange = useCallback(
    (columnId: string, direction: 'asc' | 'desc' | null) => {
      if (!onSortingChange) return
      const field = ORDERING_FIELD_BY_COLUMN_ID[columnId]
      if (!field || !direction) {
        onSortingChange('', null)
        return
      }
      onSortingChange(field, direction)
    },
    [onSortingChange]
  )

  const visibleColumns = useMemo(() => {
    return columnConfig
      .filter((c) => c.visible)
      .sort((a, b) => a.order - b.order)
      .map((c) => allColumns.find((col) => (col as any).accessorKey === c.id || col.id === c.id))
      .filter(Boolean) as ColumnDef<SalesInvoice>[]
  }, [columnConfig, allColumns])

  const actions: TableAction<SalesInvoice>[] = [
    {
      label: 'Xem chi tiết',
      icon: <IconEye size={16} />,
      show: () => ability.can('retrieve', 'salesinvoice'),
      onClick: (record) => {
        navigate(APP_PATH.SALES_INVOICE_DETAIL.replace(':id', record.id.toString()))
      },
    },
    {
      label: 'Phát hành HĐ',
      icon: <IconCheck size={16} />, // MANDATORY: Exclusive use of IconCheck
      show: (record) =>
        ability.can('update', 'salesinvoice') && record.status === SalesInvoiceStatus.DRAFT,
      onClick: (record) => {
        if (onIssue) onIssue(record)
      },
    },
    {
      label: 'Điều chỉnh HĐ',
      icon: <IconPencilsimple size={16} />,
      show: (record) =>
        ability.can('update', 'salesinvoice') && record.status === SalesInvoiceStatus.ISSUED,
      onClick: (record) => {
        if (onAdjust) onAdjust(record)
      },
    },
    {
      label: 'Hủy hóa đơn',
      icon: <IconTrash size={16} />,
      variant: 'danger',
      show: (record) =>
        ability.can('destroy', 'salesinvoice') &&
        (record.status === SalesInvoiceStatus.DRAFT || record.status === SalesInvoiceStatus.ISSUED),
      onClick: (record) => {
        if (onVoid) onVoid(record)
      },
    },
    {
      label: 'Chỉnh sửa',
      icon: <IconPencilsimple size={16} />,
      show: (record) =>
        ability.can('update', 'salesinvoice') && record.status === SalesInvoiceStatus.DRAFT,
      onClick: (record) => {
        navigate(APP_PATH.SALES_INVOICE_EDIT.replace(':id', record.id.toString()))
      },
    },
    {
      label: 'Xóa vĩnh viễn',
      icon: <IconTrash size={16} />,
      variant: 'danger',
      show: (record) =>
        ability.can('destroy', 'salesinvoice') && record.status === SalesInvoiceStatus.DRAFT,
      onClick: (record) => handleDelete(record),
    },
  ]

  if (error) {
    return <TableError />
  }

  return (
    <div className="border-border-1">
      <Table
        data={data}
        columns={visibleColumns}
        showSTT
        showActions={true}
        actionRenderType="menu"
        // Menu mở ngay tại con trỏ khi bấm vào dòng, thay vì neo cứng vào ô kebab ở cuối dòng.
        // `cell` là giá trị `Table` KHÔNG mặc định (mặc định là `cursor`) — nó lọt vào đây từ
        // commit 4c1aefb43 (21/05) cùng lượt với 6 bảng kế toán khác, không phải một lựa chọn
        // riêng cho màn này. Bảng này rộng vài nghìn px nên neo vào ô cuối là bắt người dùng
        // kéo ngang hết bảng chỉ để bấm một hành động — đúng ca `_docs/guide/
        // cursor-position-action-menu.md` khuyên dùng `cursor`.
        // Giữ `showActions` để nút kebab vẫn còn: hai đường vào cùng một menu, giống hệt hai
        // bảng đang dùng `cursor` trong repo (`DepositContractListTable`,
        // `TimesheetComplaintListTable`).
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
        /**
         * `manualSorting` là bắt buộc, không phải tuỳ chọn: thiếu nó `useTable` bật
         * `getSortedRowModel()` và **chỉ sắp xếp 25 dòng của trang đang xem** trong khi bảng
         * phân trang phía server — kế toán tưởng đã sort cả tập lọc.
         */
        manualSorting
        sortingState={sortingState}
        onSortingChange={handleSortingChange}
        disableInnerOverflow={true}
        paginationPosition="static"
        stickyHeader
        showSummaryRow={!!summary}
        summaryRowCount={summaryRowCount}
        isShowTableColumnConfig={isShowTableColumnConfig}
        columnConfig={columnConfig}
        onColumnConfigApply={handleApply}
        onColumnConfigReset={handleReset}
      />
    </div>
  )
}

export default SalesInvoiceTable
