import { useMemo } from 'react'
import { formatDirectionalCurrency } from '@/utils/table/summary'
import { useNavigate } from 'react-router-dom'
import { formatDate } from '@/utils/date-utils.ts'
import { Chip, ColumnDef, Table, TableAction } from '@/components/ui'
import { ColoredValueVariant } from '@/api/schema'
import TableError from '@/components/ui/table/TableError'
import { BankAccountCell, InvoiceRefListCell, ReferenceCode } from '@/components/commons'
import { IconCheck, IconEye, IconPencilsimple, IconProhibit, IconTrash } from '@/assets/icons'
import { APP_PATH } from '@/routes'
import { useAbility } from '@/lib/ability.ts'
import type { PaymentVoucherList } from '@/features/accounting/payment-vouchers/services/payment-voucher-service.ts'
import type { PaymentVoucherSummary } from '@/features/accounting/payment-vouchers/services/payment-voucher-service.ts'
import {
  PAYEE_TYPE_VARIANT,
  PAYMENT_VOUCHER_CONSTANT_KEYS,
  PAYMENT_VOUCHER_CONSTANT_MODULE,
  PaymentVoucherStatus,
} from '@/features/accounting/payment-vouchers/constants/payment-voucher-constants.ts'
import { PaymentVoucherStatusBadge } from '@/features/accounting/payment-vouchers/_shares/components/PaymentVoucherStatusBadge.tsx'
import useAppConstant from '@/hooks/useAppConstant.ts'
import type { ColumnConfig } from '@/types/table'
import { resolvePayee } from '@/features/accounting/payment-vouchers/utils/payment-voucher-utils.ts'
import PayeeLink from '@/features/accounting/payment-vouchers/_shares/components/PayeeLink.tsx'
import { useColumnConfig } from '@/hooks/useColumnConfig.ts'

type PaymentVoucherTableProps = {
  data: PaymentVoucherList[]
  isLoading: boolean
  error?: Error | null
  pageCount: number
  pageSize: number
  currentPage: number
  totalRecords: number
  onPaginationChange: (pageIndex: number, newPageSize: number) => void
  onPost?: (record: PaymentVoucherList) => void
  onCancel?: (record: PaymentVoucherList) => void
  onDelete?: (record: PaymentVoucherList) => void
  onClearFilter?: () => void
  hasFilter?: boolean
  isShowTableColumnConfig?: boolean
  /**
   * Column totals over the WHOLE filtered set, from the `/summary/` sibling endpoint. Never
   * summed from `data` — that is one page, and its sum would read as the filter's total.
   */
  summary?: PaymentVoucherSummary
  /** Rows behind `summary`, shown next to the "TỔNG CỘNG" label. */
  summaryRowCount?: number
}

const PaymentVoucherTable = ({
  data,
  isLoading,
  error,
  pageCount,
  pageSize,
  currentPage,
  totalRecords,
  onPaginationChange,
  onPost,
  onCancel,
  onDelete,
  onClearFilter,
  hasFilter,
  isShowTableColumnConfig,
  summary,
  summaryRowCount,
}: PaymentVoucherTableProps) => {
  const navigate = useNavigate()
  const ability = useAbility()

  const { keysMap } = useAppConstant({
    module: PAYMENT_VOUCHER_CONSTANT_MODULE,
    keys: [PAYMENT_VOUCHER_CONSTANT_KEYS.PAYMENT_METHOD, PAYMENT_VOUCHER_CONSTANT_KEYS.PAYEE_TYPE],
  })

  const paymentMethodLabels = keysMap.get(PAYMENT_VOUCHER_CONSTANT_KEYS.PAYMENT_METHOD) as Record<
    string,
    string
  > | null

  const payeeTypeLabels = keysMap.get(PAYMENT_VOUCHER_CONSTANT_KEYS.PAYEE_TYPE) as Record<
    string,
    string
  > | null

  const allColumns = useMemo<ColumnDef<PaymentVoucherList>[]>(
    () => [
      {
        accessorKey: 'code',
        header: 'Mã PC',
        cell: ({ row }) => (
          <div className="flex flex-col gap-0.5">
            <ReferenceCode
              code={row.original.code}
              linkTo={APP_PATH.PAYMENT_VOUCHER_DETAIL.replace(':id', String(row.original.id))}
            />
            {row.original.auto_generated_from_offset && (
              <span className="text-xs text-gray-500">Tạo từ bù trừ</span>
            )}
          </div>
        ),
        meta: { width: 'w-[140px]', sortable: true, frozen: true },
      },
      {
        accessorKey: 'voucher_date',
        header: 'Ngày',
        cell: ({ row }) =>
          row.original.voucher_date ? formatDate(row.original.voucher_date) : '-',
        meta: { width: 'w-[110px]', sortable: true },
      },
      {
        id: 'payee',
        header: 'Đối tượng chi',
        cell: ({ row }) => {
          const record = row.original
          const { name, code } = resolvePayee(record)
          const typeLabel = record.payee_type
            ? (payeeTypeLabels?.[record.payee_type] ?? record.payee_type)
            : null
          const typeVariant = record.payee_type
            ? (PAYEE_TYPE_VARIANT[record.payee_type] ?? ColoredValueVariant.GREY)
            : null
          return (
            <div className="flex flex-col gap-0.5">
              {code && (
                <PayeeLink record={record}>
                  <code className="text-xs text-gray-500">{code}</code>
                </PayeeLink>
              )}
              {name ? (
                <PayeeLink record={record} className="text-sm font-medium">
                  {name}
                </PayeeLink>
              ) : (
                <span className="text-gray-400">—</span>
              )}
              {typeLabel && typeVariant && (
                <Chip
                  label={String(typeLabel)}
                  variant={typeVariant}
                  size="small"
                  className="w-fit"
                />
              )}
            </div>
          )
        },
        meta: { width: 'w-[180px]', sortable: false },
      },
      {
        id: 'account',
        header: 'TK chi',
        cell: ({ row }) => (
          <BankAccountCell
            account={row.original.from_bank_account_detail}
            fallbackId={row.original.from_bank_account}
          />
        ),
        meta: { width: 'w-[180px]', sortable: false },
      },
      {
        id: 'payment_method',
        header: 'Phương thức',
        cell: ({ row }) =>
          paymentMethodLabels?.[row.original.payment_method] ?? row.original.payment_method,
        meta: { width: 'w-[120px]', sortable: false },
      },
      {
        id: 'reconciliation',
        header: 'Mã tham chiếu ngân hàng',
        cell: ({ row }) =>
          row.original.bank_ref ? (
            <code className="text-xs text-gray-600">{row.original.bank_ref}</code>
          ) : (
            <span className="text-gray-400">—</span>
          ),
        meta: { width: 'w-[170px]', sortable: false },
      },
      {
        id: 'invoice',
        header: 'Hóa đơn',
        cell: ({ row }) => (
          <InvoiceRefListCell
            invoices={row.original.input_invoices}
            linkTo={(id) => APP_PATH.INPUT_INVOICE_DETAIL.replace(':id', String(id))}
          />
        ),
        meta: { width: 'w-[220px]', sortable: false },
      },
      {
        accessorKey: 'total_amount',
        header: 'Số tiền (VND)',
        // `total_amount_with_vat` KHÔNG tồn tại trên PaymentVoucher (chỉ hóa đơn mới có) — lối
        // đọc cũ qua `as any` luôn `undefined` và rơi về `total_amount`. Đọc thẳng cho khớp
        // đúng field mà `footer` cộng, nếu không thì có ngày dòng tổng lệch với thân bảng.
        cell: ({ row }) => (
          <span className="text-data-red-default font-semibold">
            {formatDirectionalCurrency(row.original.total_amount, '−')}
          </span>
        ),
        footer: () => formatDirectionalCurrency(summary?.summary.total_amount, '−'),
        meta: { width: 'w-[160px]', sortable: true, align: 'right' },
      },
      {
        id: 'status',
        header: 'Trạng thái',
        cell: ({ row }) =>
          row.original.status ? <PaymentVoucherStatusBadge status={row.original.status} /> : '-',
        meta: { width: 'w-[110px]', sortable: false },
      },
    ],
    [paymentMethodLabels, payeeTypeLabels, summary]
  )

  const defaultColumnConfig: ColumnConfig[] = useMemo(
    () => [
      { id: 'code', label: 'Mã PC', visible: true, order: 0 },
      { id: 'voucher_date', label: 'Ngày', visible: true, order: 1 },
      { id: 'payee', label: 'Đối tượng chi', visible: true, order: 2 },
      { id: 'account', label: 'TK chi', visible: true, order: 3 },
      { id: 'payment_method', label: 'Phương thức', visible: true, order: 4 },
      { id: 'reconciliation', label: 'Mã tham chiếu ngân hàng', visible: true, order: 5 },
      { id: 'invoice', label: 'Hóa đơn', visible: true, order: 6 },
      { id: 'total_amount', label: 'Số tiền (VND)', visible: true, order: 7 },
      { id: 'status', label: 'Trạng thái', visible: true, order: 8 },
    ],
    []
  )

  const {
    columns: columnConfig,
    handleApply,
    handleReset,
  } = useColumnConfig(defaultColumnConfig, {
    storageKey: 'accounting-payment-vouchers',
  })

  const visibleColumns = useMemo(() => {
    return columnConfig
      .filter((c) => c.visible)
      .sort((a, b) => a.order - b.order)
      .map((c) => allColumns.find((col) => (col as any).accessorKey === c.id || col.id === c.id))
      .filter(Boolean) as ColumnDef<PaymentVoucherList>[]
  }, [columnConfig, allColumns])

  const rowActions: TableAction<PaymentVoucherList>[] = useMemo(() => {
    const actions: TableAction<PaymentVoucherList>[] = []

    if (ability.can('retrieve', 'paymentvoucher')) {
      actions.push({
        label: 'Xem chi tiết',
        icon: <IconEye size={16} />,
        onClick: (record) =>
          navigate(APP_PATH.PAYMENT_VOUCHER_DETAIL.replace(':id', String(record.id))),
      })
    }

    if (ability.can('update', 'paymentvoucher')) {
      actions.push({
        label: 'Chỉnh sửa',
        icon: <IconPencilsimple size={16} />,
        show: (record) => record.status === PaymentVoucherStatus.DRAFT,
        onClick: (record) =>
          navigate(APP_PATH.PAYMENT_VOUCHER_EDIT.replace(':id', String(record.id))),
      })
    }

    if (ability.can('post_voucher', 'paymentvoucher')) {
      actions.push({
        label: 'Ghi sổ',
        icon: <IconCheck size={16} />,
        show: (record) => record.status === PaymentVoucherStatus.DRAFT,
        onClick: (record) => onPost?.(record),
      })
    }

    // Hủy chỉ áp dụng phiếu đã ghi sổ (POSTED → CANCELLED, revert phân bổ);
    // phiếu nháp dùng Xóa nháp (destroy)
    if (ability.can('cancel', 'paymentvoucher')) {
      actions.push({
        label: 'Hủy phiếu',
        icon: <IconProhibit size={16} />,
        show: (record) => record.status === PaymentVoucherStatus.POSTED,
        onClick: (record) => onCancel?.(record),
      })
    }

    if (ability.can('destroy', 'paymentvoucher')) {
      actions.push({
        label: 'Xóa nháp',
        icon: <IconTrash size={16} />,
        show: (record) => record.status === PaymentVoucherStatus.DRAFT,
        onClick: (record) => onDelete?.(record),
      })
    }

    return actions
  }, [ability, navigate, onPost, onCancel, onDelete])

  if (error) {
    return <TableError />
  }

  return (
    <Table
      data={data}
      columns={visibleColumns}
      showActions={true}
      actionRenderType="menu"
      // Menu mở tại con trỏ — xem ghi chú cùng nội dung ở `AccountingPeriodTable`.
      actionMenuPosition="cursor"
      rowActions={rowActions}
      isLoading={isLoading}
      totalRecords={totalRecords}
      pageSize={pageSize}
      pageCount={pageCount}
      currentPageIndex={currentPage - 1}
      onPaginationChange={onPaginationChange}
      hasFilter={hasFilter}
      onClearFilter={onClearFilter}
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
  )
}

export default PaymentVoucherTable
