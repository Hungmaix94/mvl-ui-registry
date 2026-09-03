import { useMemo, useCallback } from 'react'
import { formatSummaryCurrency, toSummaryNumber } from '@/utils/table/summary'
import { useNavigate } from 'react-router-dom'
import type { ColumnDef } from '@tanstack/react-table'
import { Table } from '@/components/ui'
import TableError from '@/components/ui/table/TableError'
import { IconEye, IconCheck, IconPencilsimple, IconTrash } from '@/assets/icons'
import { APP_PATH } from '@/routes'
import { PAGE_SIZE } from '@/constants/table'
import { formatDate } from '@/utils/date-utils'
import { formatCurrencyVND, formatPct } from '@/utils/common'
import { inputInvoiceProjectName } from '@/features/accounting/input-invoices/utils/input-invoice-project'
import {
  inputInvoicePaidPct,
  inputInvoiceRemainingToPay,
  inputInvoiceSummaryRemaining,
} from '@/features/accounting/input-invoices/utils/input-invoice-payment'
import { useAbility } from '@/lib/ability'
import type { InputInvoice } from '@/features/accounting/input-invoices/services/input-invoice-service'
import type { InputInvoiceSummary } from '@/features/accounting/input-invoices/services/input-invoice-service'
import { useDeleteInputInvoice } from '@/features/accounting/input-invoices/services/input-invoice-service'
import { InputInvoiceStatusBadge } from './InputInvoiceStatusBadge'
import { InputInvoiceCounterpartyType } from '../types/input-invoice-types'
import type { TableAction, ColumnConfig } from '@/types/table'
import { ReferenceCode } from '@/components/commons'
import { useDialog } from '@/hooks/useDialog'
import { useInvalidateQueries } from '@/hooks/useApiQuery'
import toastService from '@/services/toast-service'
import { useColumnConfig } from '@/hooks/useColumnConfig'
import { InputInvoiceStatus as InputInvoiceStatus } from '@/constants/api-schema-aliases'

type Props = {
  data: InputInvoice[]
  isLoading: boolean
  error?: unknown
  totalRecords?: number
  pageSize?: number
  pageCount?: number
  currentPageIndex?: number
  onPaginationChange?: (pageIndex: number, pageSize: number) => void
  onVerify?: (record: InputInvoice) => void
  onMarkReceived?: (record: InputInvoice) => void
  onDeleteSuccess?: () => void
  isShowTableColumnConfig?: boolean
  /**
   * Column totals over the WHOLE filtered set, from the `/summary/` sibling endpoint. Never
   * summed from `data` — that is one page, and its sum would read as the filter's total.
   */
  summary?: InputInvoiceSummary
  /** Rows behind `summary`, shown next to the "TỔNG CỘNG" label. */
  summaryRowCount?: number
}

const InputInvoiceTable = ({
  data,
  isLoading,
  error,
  totalRecords = 0,
  pageSize = PAGE_SIZE,
  pageCount = 0,
  currentPageIndex = 0,
  onPaginationChange,
  onVerify,
  onMarkReceived,
  onDeleteSuccess,
  isShowTableColumnConfig,
  summary,
  summaryRowCount,
}: Props) => {
  const navigate = useNavigate()
  const ability = useAbility()
  const { displayConfirm } = useDialog()
  const deleteMutation = useDeleteInputInvoice()
  const invalidateQueries = useInvalidateQueries()

  const handleDelete = useCallback(
    (record: InputInvoice) => {
      displayConfirm({
        title: 'Xác nhận xóa hóa đơn',
        content: (
          <div className="text-content-dark-2">
            Bạn có chắc chắn muốn xóa hóa đơn <strong>{record.code}</strong>?
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
            toastService.success('Xóa hóa đơn đầu vào thành công')
            await invalidateQueries.invalidateByPrefix('accounting/input-invoices')
            onDeleteSuccess?.()
          } catch {
            // Error handled by service layer
          }
        },
      })
    },
    [displayConfirm, deleteMutation, invalidateQueries, onDeleteSuccess]
  )

  const allColumns = useMemo<ColumnDef<InputInvoice>[]>(
    () => [
      {
        accessorKey: 'code',
        header: 'Mã HĐ',
        cell: ({ row }) => (
          <ReferenceCode
            code={row.original.code}
            linkTo={APP_PATH.INPUT_INVOICE_DETAIL.replace(':id', row.original.id.toString())}
          />
        ),
        meta: { width: 'w-[130px]', sortable: true, frozen: true },
      },
      {
        accessorKey: 'invoice_date',
        header: 'Ngày',
        cell: ({ row }) =>
          row.original.invoice_date ? formatDate(row.original.invoice_date) : '-',
        meta: { width: 'w-[100px]', sortable: true },
      },
      {
        id: 'counterparty',
        header: 'Sàn liên kết',
        cell: ({ row }) => {
          const rec = row.original
          let name: React.ReactNode = <span className="text-gray-400">—</span>
          if (rec.counterparty_type === InputInvoiceCounterpartyType.EXCHANGE) {
            name =
              rec.exchange_detail?.name ||
              rec.exchange_detail?.code ||
              `Sàn #${rec.exchange ?? '—'}`
          } else if (rec.counterparty_type === InputInvoiceCounterpartyType.COLLABORATOR) {
            name = `CTV #${rec.collaborator ?? '—'}`
          } else if (rec.counterparty_type === InputInvoiceCounterpartyType.EMPLOYEE) {
            name = 'Nhân sự'
          }
          return <span className="font-normal text-gray-900">{name}</span>
        },
        meta: { sortable: false },
      },

      {
        id: 'reconciliation',
        header: 'Đối chiếu',
        // In MÃ phiếu (FRS…), không phải "#<id>" — xem ghi chú cùng nội dung ở `SalesInvoiceTable`.
        // Link vẫn đi theo id, và vẫn rẽ theo `counterparty_type` vì ba loại đối tác dẫn tới ba
        // màn chi tiết khác nhau.
        cell: ({ row }) => {
          const reconId = row.original.f2_reconciliation_sheet
          const reconCode = row.original.f2_reconciliation_sheet_code
          const type = row.original.counterparty_type
          let link: string | undefined = undefined
          if (reconId) {
            if (type === 'COLLABORATOR') {
              link = APP_PATH.CTV_RECONCILIATION_DETAIL.replace(':id', String(reconId))
            } else if (type === 'SUPPLIER') {
              link = APP_PATH.INVESTOR_RECONCILIATION_DETAIL.replace(':id', String(reconId))
            } else {
              link = APP_PATH.F2_RECONCILIATION_DETAIL.replace(':id', String(reconId))
            }
          }
          return <ReferenceCode code={reconCode || null} fallback="—" linkTo={link} />
        },
        meta: { width: 'w-[150px]', sortable: false },
      },
      {
        // Dự án của hoá đơn. BE lấy theo PHIẾU đối chiếu F2 trước (1 phiếu = 1 dự án, cả hai
        // FK đều non-nullable), rồi mới lùi về dòng đầu tiên có dự án — xem
        // `InputInvoiceSerializer.get_project_name`. Phải có bước lùi đó vì trên DEV chỉ 79/213
        // hoá đơn có phiếu, và 18 hoá đơn không phiếu vẫn biết dự án qua dòng; nếu chỉ đọc phiếu
        // thì 18 dòng này hiện "—" trong khi bảng sản phẩm ở màn chi tiết lại ghi rõ tên.
        // Đặt cạnh "Đối chiếu" vì đó là nguồn chính của nó.
        // `id` chứ không `accessorKey`: field chưa có trong `schema.ts` nên không có accessor
        // để trỏ tới — đọc qua `inputInvoiceProjectName` (xem TODO(schema) trong file đó).
        id: 'project_name',
        header: 'Dự án',
        cell: ({ row }) => {
          const name = inputInvoiceProjectName(row.original)
          return name ? (
            <span className="font-normal text-gray-900">{name}</span>
          ) : (
            <span className="text-gray-400">—</span>
          )
        },
        // BE không sort được cột này (nó không phải field của bảng), nên để nút chết là sai.
        meta: { width: 'w-[200px]', sortable: false },
      },
      {
        id: 'amount_before_tax',
        header: 'Tiền hàng',
        cell: ({ row }) => {
          const amountBeforeTax = Number(row.original.total_amount || 0)
          return (
            <span className="font-medium text-gray-900">{formatCurrencyVND(amountBeforeTax)}</span>
          )
        },
        footer: () => formatSummaryCurrency(summary?.summary.total_amount),
        meta: { width: 'w-[140px]', sortable: false, align: 'right' },
      },
      {
        id: 'tax_amount',
        header: 'VAT',
        cell: ({ row }) => {
          const taxAmount = Number(row.original.vat_amount || 0)
          const vatRate = row.original.vat_rates ? ` (${row.original.vat_rates}%)` : ''
          return (
            <span className="font-medium text-gray-900">
              {formatCurrencyVND(taxAmount)}
              <span className="ml-1 text-xs font-normal text-gray-400">{vatRate}</span>
            </span>
          )
        },
        footer: () => formatSummaryCurrency(summary?.summary.vat_amount),
        meta: { width: 'w-[120px]', sortable: false, align: 'right' },
      },
      {
        accessorKey: 'total_amount_with_vat',
        header: 'Tổng cộng',
        cell: ({ row }) =>
          row.original.total_amount_with_vat ? (
            <span className="font-bold text-gray-900">
              {formatCurrencyVND(Number(row.original.total_amount_with_vat))}
            </span>
          ) : (
            '—'
          ),
        footer: () => formatSummaryCurrency(summary?.summary.total_amount_with_vat),
        meta: { width: 'w-[140px]', sortable: true, align: 'right' },
      },
      {
        accessorKey: 'external_invoice_no',
        header: 'Số HĐ đã ghi sổ',
        // Số hóa đơn thực tế kế toán nhập lúc nhận / xác nhận hóa đơn (CR STT43).
        cell: ({ row }) => (
          <span className="font-medium text-gray-900">
            {row.original.external_invoice_no || '—'}
          </span>
        ),
        meta: { width: 'w-[150px]', sortable: false, align: 'right' },
      },
      {
        id: 'paid_amount',
        header: 'Số tiền đã chi',
        // `paid_amount` is settled at GROSS when a payment voucher is POSTED (SRS 20.7 §3.1).
        // Settlement is per tier and never branches on payment_method, so an OFFSET ("Bù trừ")
        // voucher counts here too — which is what business asked for.
        cell: ({ row }) => (
          <span className="font-medium text-gray-900">
            {formatCurrencyVND(Number(row.original.paid_amount || 0))}
          </span>
        ),
        footer: () => formatSummaryCurrency(summary?.summary.paid_amount),
        meta: { width: 'w-[140px]', sortable: false, align: 'right' },
      },
      {
        id: 'paid_pct',
        header: 'Tỷ lệ tiền đi',
        cell: ({ row }) => (
          <span className="font-medium text-gray-900">
            {formatPct(inputInvoicePaidPct(row.original), 1)}
          </span>
        ),
        // No footer on purpose: a summed rate is meaningless, and the /summary/ endpoint
        // deliberately ships no percentage key. Mirrors the sales-invoice screen.
        meta: { width: 'w-[120px]', sortable: false, align: 'right' },
      },
      {
        id: 'remaining_amount',
        header: 'Số tiền còn lại',
        cell: ({ row }) => {
          const remaining = inputInvoiceRemainingToPay(row.original)
          // Chi vượt hóa đơn hiện số âm và tô đỏ — nghiệp vụ chốt KHÔNG kẹp về 0, để kế toán
          // nhìn ra bất thường ngay thay vì bị giấu đi.
          return (
            <span
              className={
                remaining < 0
                  ? 'text-action-primary-red-default font-medium'
                  : 'font-medium text-gray-900'
              }
            >
              {formatCurrencyVND(remaining)}
            </span>
          )
        },
        footer: () => {
          const remaining = inputInvoiceSummaryRemaining(
            toSummaryNumber(summary?.summary.total_amount_with_vat),
            toSummaryNumber(summary?.summary.paid_amount)
          )
          return remaining === null ? '—' : formatSummaryCurrency(remaining)
        },
        meta: { width: 'w-[140px]', sortable: false, align: 'right' },
      },
      {
        id: 'status',
        header: 'Trạng thái',
        cell: ({ row }) =>
          row.original.status ? <InputInvoiceStatusBadge status={row.original.status} /> : '-',
        meta: { width: 'w-[100px]', sortable: false },
      },
    ],
    [summary]
  )

  const defaultColumnConfig: ColumnConfig[] = useMemo(
    () => [
      { id: 'code', label: 'Mã HĐ', visible: true, order: 0 },
      { id: 'invoice_date', label: 'Ngày', visible: true, order: 1 },
      { id: 'counterparty', label: 'Sàn liên kết', visible: true, order: 2 },
      { id: 'reconciliation', label: 'Đối chiếu', visible: true, order: 3 },
      { id: 'project_name', label: 'Dự án', visible: true, order: 4 },
      { id: 'amount_before_tax', label: 'Tiền hàng', visible: true, order: 5 },
      { id: 'tax_amount', label: 'VAT', visible: true, order: 6 },
      { id: 'total_amount_with_vat', label: 'Tổng cộng', visible: true, order: 7 },
      { id: 'external_invoice_no', label: 'Số HĐ đã ghi sổ', visible: true, order: 8 },
      { id: 'paid_amount', label: 'Số tiền đã chi', visible: true, order: 9 },
      { id: 'paid_pct', label: 'Tỷ lệ tiền đi', visible: true, order: 10 },
      { id: 'remaining_amount', label: 'Số tiền còn lại', visible: true, order: 11 },
      { id: 'status', label: 'Trạng thái', visible: true, order: 12 },
    ],
    []
  )

  const {
    columns: columnConfig,
    handleApply,
    handleReset,
  } = useColumnConfig(defaultColumnConfig, {
    storageKey: 'accounting-input-invoices',
  })

  const visibleColumns = useMemo(() => {
    return (
      columnConfig
        .filter((c) => c.visible)
        .sort((a, b) => a.order - b.order)
        // `accessorKey` chỉ tồn tại trên nhánh accessor của union ColumnDef — dùng `in` để thu hẹp
        // kiểu, không cast. Cột khai bằng `accessorKey` (vd Mã HĐ, Tổng cộng) khớp qua vế đầu, cột
        // khai bằng `id` trần (vd Sàn liên kết, Tỷ lệ tiền đi) khớp qua vế sau.
        .map((c) =>
          allColumns.find(
            (col) => ('accessorKey' in col && col.accessorKey === c.id) || col.id === c.id
          )
        )
        .filter(Boolean) as ColumnDef<InputInvoice>[]
    )
  }, [columnConfig, allColumns])

  const actions: TableAction<InputInvoice>[] = [
    {
      label: 'Xem chi tiết',
      icon: <IconEye size={16} />,
      show: () => ability.can('retrieve', 'inputinvoice'),
      onClick: (record) => {
        navigate(APP_PATH.INPUT_INVOICE_DETAIL.replace(':id', record.id.toString()))
      },
    },
    {
      label: 'Nhận hóa đơn',
      icon: <IconCheck size={16} />,
      // CR STT59 (ClickUp `86eyqrn7k`): điều kiện này trước đây chỉ nhận `PENDING`, trong khi BE
      // ghi rõ `PENDING` là *"legacy alias for DRAFT"* (`apps/accounting/constants.py`) và luồng
      // hiện tại sinh hoá đơn ở `DRAFT` — nên trên dữ liệu thật nút gần như không bao giờ hiện
      // (đo dev 25/08: 43 dòng DRAFT vs 4 dòng PENDING). Màn Chi tiết đã đúng từ trước
      // (`InputInvoiceDetailPage.tsx::isWaitingReceive`); đây là đồng bộ hai màn, KHÔNG nới rộng:
      // BE `input_invoice_service.mark_received` chấp nhận đúng tập này (`is_draft_like`).
      show: (record) =>
        ability.can('mark_received', 'inputinvoice') &&
        (record.status === InputInvoiceStatus.DRAFT ||
          (record.status === InputInvoiceStatus.PENDING && !record.external_invoice_no)),
      onClick: (record) => {
        if (onMarkReceived) onMarkReceived(record)
      },
    },
    {
      label: 'Xác nhận hóa đơn',
      icon: <IconCheck size={16} />, // MANDATORY: Use IconCheck exclusively for checking / validation actions
      show: (record) =>
        ability.can('verify', 'inputinvoice') &&
        (record.status === InputInvoiceStatus.RECEIVED ||
          (record.status === InputInvoiceStatus.PENDING && !!record.external_invoice_no)),
      onClick: (record) => {
        if (onVerify) onVerify(record)
      },
    },
    {
      label: 'Chỉnh sửa',
      icon: <IconPencilsimple size={16} />,
      show: (record) =>
        ability.can('update', 'inputinvoice') &&
        (record.status === InputInvoiceStatus.DRAFT ||
          record.status === InputInvoiceStatus.RECEIVED ||
          record.status === InputInvoiceStatus.PENDING),
      onClick: (record) => {
        navigate(APP_PATH.INPUT_INVOICE_EDIT.replace(':id', record.id.toString()))
      },
    },
    {
      label: 'Xóa hóa đơn',
      icon: <IconTrash size={16} />,
      variant: 'danger',
      show: (record) =>
        ability.can('destroy', 'inputinvoice') &&
        (record.status === InputInvoiceStatus.DRAFT ||
          (record.status === InputInvoiceStatus.PENDING && !record.external_invoice_no)),
      onClick: (record) => handleDelete(record),
    },
  ]

  if (error) {
    return <TableError />
  }

  return (
    <div className="border-border-1">
      <Table
        data={data || []}
        columns={visibleColumns}
        showSTT
        showActions={true}
        actionRenderType="menu"
        // Menu mở tại con trỏ khi bấm vào dòng — xem ghi chú đầy đủ ở `SalesInvoiceTable`.
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

export default InputInvoiceTable
