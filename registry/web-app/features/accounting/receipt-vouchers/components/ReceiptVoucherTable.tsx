import { useMemo } from 'react'
import { formatDirectionalCurrency } from '@/utils/table/summary'
import { useNavigate } from 'react-router-dom'
import type { ColumnDef } from '@tanstack/react-table'
import { Table, Chip } from '@/components/ui'
import { ColoredValueVariant } from '@/api/schema'
import TableError from '@/components/ui/table/TableError'
import { IconCheck, IconEye, IconPencilsimple, IconPrinter, IconTrash } from '@/assets/icons'
import { APP_PATH } from '@/routes'
import { PAGE_SIZE } from '@/constants/table'
import { formatDate } from '@/utils/date-utils'
import { useAbility } from '@/lib/ability'
import type { ReceiptVoucherList } from '@/features/accounting/receipt-vouchers/services/receipt-voucher-service'
import type { ReceiptVoucherSummary } from '@/features/accounting/receipt-vouchers/services/receipt-voucher-service'
import { ReceiptVoucherStatusBadge } from './ReceiptVoucherStatusBadge'
import { ReceiptVoucherStatus } from '@/features/accounting/receipt-vouchers/services/receipt-voucher-service'
import type { TableAction, ColumnConfig } from '@/types/table'
import toastService from '@/services/toast-service'
import { BankAccountCell, InvoiceRefListCell, ReferenceCode } from '@/components/commons'
import useAppConstant from '@/hooks/useAppConstant'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import {
  useBankAccount,
  type CompanyBankAccount,
} from '@/features/accounting/bank-accounts/services/bank-account-service'
import { useColumnConfig } from '@/hooks/useColumnConfig'

const FALLBACK_PAYMENT_METHOD_LABELS: Record<string, string> = {
  TRANSFER: 'Chuyển khoản',
  CASH: 'Tiền mặt',
  OFFSET: 'Bù trừ',
}

const FALLBACK_PAYER_TYPE_LABELS: Record<string, string> = {
  INVESTOR: 'Chủ đầu tư',
  EXCHANGE: 'Sàn/F2',
  COLLABORATOR: 'CTV',
  OTHER: 'Khác',
}

const PAYER_TYPE_COLORS: Record<string, ColoredValueVariant> = {
  INVESTOR: ColoredValueVariant.BLUE,
  EXCHANGE: ColoredValueVariant.PURPLE,
  COLLABORATOR: ColoredValueVariant.ORANGE,
  OTHER: ColoredValueVariant.GREY,
}

type Props = {
  data: ReceiptVoucherList[]
  isLoading: boolean
  error?: unknown
  totalRecords?: number
  pageSize?: number
  pageCount?: number
  currentPageIndex?: number
  onPaginationChange?: (pageIndex: number, pageSize: number) => void
  /** CR 86eyfnh0e: ghi sổ ngay từ màn danh sách với phiếu trạng thái Bản nháp. */
  onPost?: (record: ReceiptVoucherList) => void
  isShowTableColumnConfig?: boolean
  /**
   * Column totals over the WHOLE filtered set, from the `/summary/` sibling endpoint. Never
   * summed from `data` — that is one page, and its sum would read as the filter's total.
   */
  summary?: ReceiptVoucherSummary
  /** Rows behind `summary`, shown next to the "TỔNG CỘNG" label. */
  summaryRowCount?: number
}

const ReceiptBankAccountCell = ({
  account,
  fallbackId,
}: {
  account: CompanyBankAccount | null | undefined
  fallbackId?: number | null
}) => {
  const { data: fetchedAccount } = useBankAccount(fallbackId ?? 0, {
    enabled: !account && !!fallbackId,
  })

  return <BankAccountCell account={account || fetchedAccount} fallbackId={fallbackId} />
}

const ReceiptVoucherTable = ({
  data,
  isLoading,
  error,
  totalRecords = 0,
  pageSize = PAGE_SIZE,
  pageCount = 0,
  currentPageIndex = 0,
  onPaginationChange,
  onPost,
  isShowTableColumnConfig,
  summary,
  summaryRowCount,
}: Props) => {
  const navigate = useNavigate()
  const ability = useAbility()

  const { keysMap } = useAppConstant({
    module: 'accounting',
    keys: [
      APP_CONSTANT_KEY.ACCOUNTING.RECEIPT_VOUCHER_PAYMENT_METHOD_CHOICES,
      APP_CONSTANT_KEY.ACCOUNTING.RECEIPT_VOUCHER_PAYER_TYPE_CHOICES,
    ],
  })

  const paymentMethodLabels = keysMap.get(
    APP_CONSTANT_KEY.ACCOUNTING.RECEIPT_VOUCHER_PAYMENT_METHOD_CHOICES
  ) as Record<string, string> | null

  const payerTypeLabels = keysMap.get(
    APP_CONSTANT_KEY.ACCOUNTING.RECEIPT_VOUCHER_PAYER_TYPE_CHOICES
  ) as Record<string, string> | null

  const allColumns = useMemo<ColumnDef<ReceiptVoucherList>[]>(
    () => [
      {
        accessorKey: 'code',
        header: 'Mã PT',
        cell: ({ row }) => (
          <ReferenceCode
            code={row.original.code}
            linkTo={APP_PATH.RECEIPT_VOUCHER_DETAIL.replace(':id', row.original.id.toString())}
          />
        ),
        meta: { width: 'w-[140px]', sortable: true, frozen: true },
      },
      {
        accessorKey: 'receipt_date',
        header: 'Ngày thu tiền',
        cell: ({ row }) =>
          row.original.receipt_date ? formatDate(row.original.receipt_date) : '-',
        meta: { width: 'w-[110px]', sortable: true },
      },
      {
        id: 'payer',
        header: 'Người nộp / Đối tác',
        cell: ({ row }) => {
          const { payer_name, payer_type } = row.original
          const typeLabel = payer_type
            ? (payerTypeLabels?.[payer_type] ??
              FALLBACK_PAYER_TYPE_LABELS[payer_type] ??
              payer_type)
            : null
          const typeVariant = payer_type
            ? (PAYER_TYPE_COLORS[payer_type] ?? ColoredValueVariant.GREY)
            : null
          return (
            <div className="flex flex-col gap-0.5">
              {payer_name ? (
                <span className="text-sm font-medium text-gray-800">{payer_name}</span>
              ) : (
                <span className="text-gray-400">—</span>
              )}
              {typeLabel && typeVariant && (
                <Chip label={typeLabel} variant={typeVariant} size="small" className="w-fit" />
              )}
            </div>
          )
        },
        meta: { width: 'w-[180px]', sortable: false },
      },
      {
        id: 'account',
        header: 'TK nhận',
        cell: ({ row }) => (
          <ReceiptBankAccountCell
            account={row.original.to_bank_account_detail}
            fallbackId={row.original.to_bank_account}
          />
        ),
        meta: { width: 'w-[180px]', sortable: false },
      },
      {
        id: 'payment_method',
        header: 'Phương thức',
        cell: ({ row }) =>
          paymentMethodLabels?.[row.original.payment_method] ??
          FALLBACK_PAYMENT_METHOD_LABELS[row.original.payment_method] ??
          row.original.payment_method,
        meta: { width: 'w-[120px]', sortable: false },
      },
      {
        id: 'reconciliation',
        header: 'Đối chiếu',
        cell: ({ row }) =>
          row.original.bank_transaction_ref ? (
            <code className="text-xs text-gray-600">{row.original.bank_transaction_ref}</code>
          ) : (
            <span className="text-gray-400">—</span>
          ),
        meta: { width: 'w-[130px]', sortable: false },
      },
      {
        id: 'invoice',
        header: 'Hóa đơn',
        cell: ({ row }) => (
          <InvoiceRefListCell
            invoices={row.original.sales_invoices}
            linkTo={(id) => APP_PATH.SALES_INVOICE_DETAIL.replace(':id', String(id))}
          />
        ),
        meta: { width: 'w-[220px]', sortable: false },
      },
      {
        accessorKey: 'total_amount',
        header: 'Số tiền (VND)',
        cell: ({ row }) => (
          <span className="font-semibold text-gray-900">
            {formatDirectionalCurrency(row.original.total_amount, '+')}
          </span>
        ),
        footer: () => formatDirectionalCurrency(summary?.summary.total_amount, '+'),
        meta: { width: 'w-[160px]', sortable: true, align: 'right' },
      },
      {
        id: 'status',
        header: 'Trạng thái',
        cell: ({ row }) =>
          row.original.status ? (
            <ReceiptVoucherStatusBadge status={row.original.status as ReceiptVoucherStatus} />
          ) : (
            '-'
          ),
        meta: { width: 'w-[110px]', sortable: false },
      },
    ],
    [paymentMethodLabels, payerTypeLabels, summary]
  )

  const defaultColumnConfig: ColumnConfig[] = useMemo(
    () => [
      { id: 'code', label: 'Mã PT', visible: true, order: 0 },
      { id: 'receipt_date', label: 'Ngày thu tiền', visible: true, order: 1 },
      { id: 'payer', label: 'Người nộp / Đối tác', visible: true, order: 2 },
      { id: 'account', label: 'TK nhận', visible: true, order: 3 },
      { id: 'payment_method', label: 'Phương thức', visible: true, order: 4 },
      { id: 'reconciliation', label: 'Đối chiếu', visible: true, order: 5 },
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
    storageKey: 'accounting-receipt-vouchers',
  })

  const visibleColumns = useMemo(() => {
    return columnConfig
      .filter((c) => c.visible)
      .sort((a, b) => a.order - b.order)
      .map((c) => allColumns.find((col) => (col as any).accessorKey === c.id || col.id === c.id))
      .filter(Boolean) as ColumnDef<ReceiptVoucherList>[]
  }, [columnConfig, allColumns])

  const actions: TableAction<ReceiptVoucherList>[] = [
    {
      label: 'Xem chi tiết',
      icon: <IconEye size={16} />,
      show: () => ability.can('retrieve', 'receiptvoucher'),
      onClick: (record) => {
        navigate(APP_PATH.RECEIPT_VOUCHER_DETAIL.replace(':id', record.id.toString()))
      },
    },
    {
      label: 'Chỉnh sửa',
      icon: <IconPencilsimple size={16} />,
      show: (record) =>
        ability.can('update', 'receiptvoucher') && record.status === ReceiptVoucherStatus.DRAFT,
      onClick: (record) => {
        navigate(APP_PATH.RECEIPT_VOUCHER_EDIT.replace(':id', record.id.toString()))
      },
    },
    {
      // Quyền theo đúng endpoint backend (`receiptvoucher.post_voucher`), không mượn quyền update.
      label: 'Ghi sổ',
      icon: <IconCheck size={16} />,
      show: (record) =>
        !!onPost &&
        ability.can('post_voucher', 'receiptvoucher') &&
        record.status === ReceiptVoucherStatus.DRAFT,
      onClick: (record) => onPost?.(record),
    },
    {
      label: 'In phiếu',
      icon: <IconPrinter size={16} />,
      show: () => true, // TODO: Update capability check
      onClick: (record) => {
        toastService.success(`In phiếu ${record.code}`)
      },
    },
    {
      label: 'Hủy phiếu',
      icon: <IconTrash size={16} />,
      variant: 'danger',
      show: (record) =>
        ability.can('destroy', 'receiptvoucher') &&
        record.status !== ReceiptVoucherStatus.CANCELLED,
      onClick: (record) => {
        toastService.error(`Hủy phiếu ${record.code}`)
      },
    },
  ]

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
  )
}

export default ReceiptVoucherTable
