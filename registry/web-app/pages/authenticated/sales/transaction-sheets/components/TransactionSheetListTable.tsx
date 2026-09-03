import { useMemo, useCallback, useLayoutEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { IconEye, IconPencilsimple, IconCheckcircle, IconXcircle, IconTrash } from '@/assets/icons'
import { type ColumnDef, Table, type TableAction, Chip } from '@/components/ui'
import { IconClockcounterclockwise } from '@/assets/icons/time'
import TableError from '@/components/ui/table/TableError'
import { ReferenceCode } from '@/components/commons'
import { APP_PATH } from '@/routes'
import { ColoredValueVariant } from '@/api/schema'
import { TransactionSheetApprovalStatus } from '@/constants/api-schema-aliases.ts'
import { TransactionSheet } from '@/features/sales/transaction-sheets/types/transaction-sheet'
import { useAbility } from '@/lib/ability'
import { useTransactionSheetActions } from '../hooks/useTransactionSheetActions'
import { formatCurrencyVND } from '@/utils/common'
import { formatDate } from '@/utils/date-utils'

const STATUS_VARIANTS: Record<TransactionSheetApprovalStatus, ColoredValueVariant> = {
  [TransactionSheetApprovalStatus.pending_confirm]: ColoredValueVariant.GREY,
  [TransactionSheetApprovalStatus.pending_manager]: ColoredValueVariant.ORANGE,
  [TransactionSheetApprovalStatus.pending_admin]: ColoredValueVariant.YELLOW,
  [TransactionSheetApprovalStatus.pending_admin_lead]: ColoredValueVariant.PURPLE,
  [TransactionSheetApprovalStatus.approved]: ColoredValueVariant.GREEN,
  [TransactionSheetApprovalStatus.rejected]: ColoredValueVariant.RED,
}

const STATUS_LABELS: Record<TransactionSheetApprovalStatus, string> = {
  [TransactionSheetApprovalStatus.pending_confirm]: 'Chờ NV xác nhận',
  [TransactionSheetApprovalStatus.pending_manager]: 'Chờ Quản lý duyệt',
  [TransactionSheetApprovalStatus.pending_admin]: 'Chờ Thư ký duyệt',
  [TransactionSheetApprovalStatus.pending_admin_lead]: 'Chờ Trưởng nhóm Admin duyệt',
  [TransactionSheetApprovalStatus.approved]: 'Đã duyệt',
  [TransactionSheetApprovalStatus.rejected]: 'Đã từ chối',
}

type TransactionSheetListTableProps = {
  data: TransactionSheet[]
  isLoading: boolean
  error?: unknown
  totalRecords?: number
  pageSize?: number
  pageCount?: number
  currentPage?: number
  onPageChange?: (page: number, pageSize: number) => void
  className?: string
  /**
   * Giữ hàng tiêu đề đứng yên khi cuộn dọc. **Opt-in**: bảng này còn nhúng trong tab của màn
   * Chi tiết bất động sản, nơi không có khung trang chặn chiều cao để ghim vào.
   */
  stickyHeader?: boolean
}

export const TransactionSheetListTable = ({
  data,
  isLoading,
  error,
  totalRecords,
  pageSize,
  pageCount,
  currentPage,
  onPageChange,
  className,
  stickyHeader = false,
}: TransactionSheetListTableProps) => {
  const navigate = useNavigate()
  const ability = useAbility()

  useLayoutEffect(() => {
    const tableRoot = document.querySelector('.js-transaction-sheet-table') as HTMLElement | null
    if (!tableRoot) return

    const table = tableRoot.querySelector('table') as HTMLElement | null
    if (!table) return

    const scrollContainer = table.closest(
      '[class*="overflow-x-auto"][class*="overflow-y-auto"]'
    ) as HTMLElement | null
    if (!scrollContainer) return

    const thead = table.querySelector('thead') as HTMLElement | null
    const navBar = document.querySelector('[data-name="Header"]') as HTMLElement | null
    if (!thead || !navBar) return

    let frameId: number | null = null
    let lastTranslateOffset = -1

    const applyStickyTop = () => {
      frameId = null
      const navBarBottom = Math.round(navBar.getBoundingClientRect().bottom)
      const scrollContainerTop = Math.round(scrollContainer.getBoundingClientRect().top)
      const nextTranslateOffset =
        scrollContainerTop < navBarBottom ? Math.max(0, navBarBottom - scrollContainerTop) : 0

      if (nextTranslateOffset === lastTranslateOffset) return
      lastTranslateOffset = nextTranslateOffset
      thead.style.transform =
        nextTranslateOffset > 0 ? `translateY(${nextTranslateOffset}px)` : 'translateY(0px)'
    }

    const requestStickyTopUpdate = () => {
      if (frameId !== null) return
      frameId = window.requestAnimationFrame(applyStickyTop)
    }

    requestStickyTopUpdate()
    thead.style.willChange = 'transform'
    window.addEventListener('resize', requestStickyTopUpdate)
    window.addEventListener('scroll', requestStickyTopUpdate, { passive: true })
    scrollContainer.addEventListener('scroll', requestStickyTopUpdate, { passive: true })

    return () => {
      if (frameId !== null) window.cancelAnimationFrame(frameId)
      window.removeEventListener('resize', requestStickyTopUpdate)
      window.removeEventListener('scroll', requestStickyTopUpdate)
      scrollContainer.removeEventListener('scroll', requestStickyTopUpdate)
      thead.style.transform = 'translateY(0px)'
      thead.style.willChange = ''
    }
  }, [data])

  const columns: ColumnDef<TransactionSheet>[] = useMemo(
    () => [
      {
        accessorKey: 'code',
        header: 'Mã TTGD',
        size: 200,
        cell: ({ row }) => (
          <ReferenceCode
            code={row.original.code}
            linkTo={APP_PATH.TRANSACTION_SHEET_DETAIL.replace(':id', row.original.id.toString())}
          />
        ),
        meta: { width: 'w-[200px]', sortable: true },
      },
      {
        id: 'customer',
        header: 'Khách hàng',
        size: 220,
        cell: ({ row }) => {
          const customer = row.original.customer_detail
          if (customer) {
            return (
              <Link
                to={APP_PATH.CUSTOMER_MANAGER_DETAIL.replace(':id', String(customer.id))}
                className="text-action-primary-default font-medium hover:underline"
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
              >
                {customer.name}
              </Link>
            )
          }
          return '-'
        },
        meta: { width: 'w-[220px]' },
      },
      {
        id: 'project_detail',
        header: 'Dự án',
        size: 320,
        cell: ({ row }) => {
          const detail = (row.original as any).project_detail
          if (!detail?.name) return '-'
          return (
            <Link
              to={APP_PATH.PROJECT_MANAGEMENT_DETAIL.replace(':id', String(detail.id))}
              className="text-action-primary-default font-medium hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {detail.name}
            </Link>
          )
        },
        meta: { width: 'w-[320px]' },
      },
      {
        id: 'product_inventory',
        header: 'Bất động sản',
        size: 200,
        cell: ({ row }) => {
          const detail = row.original.product_inventory_detail
          const label = detail?.unit_number || detail?.code
          if (!label) return '-'
          return (
            <Link
              to={APP_PATH.PROJECT_PRODUCT_INVENTORIES_DETAIL.replace(':id', String(detail?.id))}
              className="text-action-primary-default font-medium hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {label}
            </Link>
          )
        },
        meta: { width: 'w-[200px]' },
      },
      {
        accessorKey: 'listed_price',
        header: 'Giá niêm yết',
        size: 200,
        cell: ({ row }) =>
          row.original.listed_price
            ? formatCurrencyVND(Number(row.original.listed_price), { maximumFractionDigits: 0 })
            : '-',
        meta: { width: 'w-[200px]' },
      },
      {
        accessorKey: 'fee_calculation_price',
        header: 'Giá tạm tính',
        size: 200,
        cell: ({ row }) => {
          const val = (row.original as any).fee_calculation_price
          return val ? formatCurrencyVND(Number(val), { maximumFractionDigits: 0 }) : '-'
        },
        meta: { width: 'w-[200px]', sortable: true },
      },
      {
        id: 'deposit_date',
        header: 'Ngày đặt cọc',
        size: 180,
        cell: ({ row }) => {
          const date = (row.original as any).deposit_date
          if (!date) return '-'
          const [y, m, d] = date.split('-')
          return `${d}/${m}/${y}`
        },
        meta: { width: 'w-[180px]', sortable: true },
      },
      {
        accessorKey: 'created_at',
        header: 'Ngày tạo phiếu',
        size: 180,
        cell: ({ getValue }) => formatDate(getValue() as string | null | undefined),
        meta: { width: 'w-[180px]' },
      },
      {
        accessorKey: 'approval_status',
        header: 'Trạng thái',
        size: 200,
        cell: ({ row }) => {
          const status = row.original.approval_status
          if (!status) return '-'
          const label = STATUS_LABELS[status] || status
          const variant = STATUS_VARIANTS[status] || ColoredValueVariant.GREY
          return <Chip label={label} variant={variant} size="small" />
        },
        meta: { width: 'w-[200px]' },
      },
    ],
    []
  )

  const { handleApprove, handleReject, handleDelete } = useTransactionSheetActions()

  const actions: TableAction<TransactionSheet>[] = useMemo(
    () => [
      {
        label: 'Xem chi tiết',
        icon: <IconEye />,
        show: () => ability.can('retrieve', 'transaction_sheet'),
        onClick: (record) => {
          navigate(APP_PATH.TRANSACTION_SHEET_DETAIL.replace(':id', record.id.toString()))
        },
      },
      {
        label: 'Xem lịch sử',
        icon: <IconClockcounterclockwise />,
        show: () => ability.can('retrieve', 'transaction_sheet'),
        onClick: (record) => {
          navigate(APP_PATH.TRANSACTION_SHEET_HISTORY.replace(':id', record.id.toString()))
        },
      },
      {
        label: 'Xác nhận',
        icon: <IconCheckcircle />,
        onClick: (record) => handleApprove(record, 'Xác nhận'),
        show: (record) =>
          ability.can('confirm', 'transaction_sheet') &&
          record.approval_status === TransactionSheetApprovalStatus.pending_confirm,
      },
      {
        label: 'Xác nhận (Trưởng BP)',
        icon: <IconCheckcircle />,
        onClick: (record) => handleApprove(record, 'Xác nhận (Trưởng BP)'),
        show: (record) =>
          ability.can('manager_confirm', 'transaction_sheet') &&
          record.approval_status === TransactionSheetApprovalStatus.pending_manager,
      },
      {
        label: 'Phê duyệt',
        icon: <IconCheckcircle />,
        onClick: (record) => handleApprove(record, 'Phê duyệt'),
        show: (record) =>
          ability.can('approve', 'transaction_sheet') &&
          record.approval_status === TransactionSheetApprovalStatus.pending_admin,
      },
      {
        label: 'Phê duyệt (Trưởng nhóm Admin)',
        icon: <IconCheckcircle />,
        onClick: (record) => handleApprove(record, 'Phê duyệt (Trưởng nhóm Admin)'),
        show: (record) =>
          ability.can('admin_lead_approve', 'transaction_sheet') &&
          record.approval_status === TransactionSheetApprovalStatus.pending_admin_lead,
      },
      {
        label: 'Từ chối',
        icon: <IconXcircle />,
        onClick: (record) => handleReject(record, 'Từ chối'),
        show: (record) =>
          ability.can('reject', 'transaction_sheet') &&
          record.approval_status === TransactionSheetApprovalStatus.pending_confirm,
      },
      {
        label: 'Từ chối (Trưởng BP)',
        icon: <IconXcircle />,
        onClick: (record) => handleReject(record, 'Từ chối (Trưởng BP)'),
        show: (record) =>
          ability.can('reject', 'transaction_sheet') &&
          record.approval_status === TransactionSheetApprovalStatus.pending_manager,
      },
      {
        label: 'Admin từ chối',
        icon: <IconXcircle />,
        onClick: (record) => handleReject(record, 'Admin từ chối'),
        show: (record) =>
          ability.can('reject', 'transaction_sheet') &&
          record.approval_status === TransactionSheetApprovalStatus.pending_admin,
      },
      {
        label: 'Admin Lead từ chối',
        icon: <IconXcircle />,
        onClick: (record) => handleReject(record, 'Admin Lead từ chối'),
        show: (record) =>
          ability.can('reject', 'transaction_sheet') &&
          record.approval_status === TransactionSheetApprovalStatus.pending_admin_lead,
      },
      {
        label: 'Chỉnh sửa',
        icon: <IconPencilsimple />,
        onClick: (record) => {
          navigate(APP_PATH.TRANSACTION_SHEET_EDIT.replace(':id', record.id.toString()))
        },
        // REJECTED is rewound to the previous editor and stays editable; only the
        // frozen final-approver desk (pending_admin_lead) and approved are read-only.
        show: (record) =>
          ability.can('update', 'transaction_sheet') &&
          record.approval_status !== TransactionSheetApprovalStatus.approved &&
          record.approval_status !== TransactionSheetApprovalStatus.pending_admin_lead,
      },
      {
        label: 'Xóa',
        icon: <IconTrash />,
        onClick: (record) => handleDelete(record),
        show: (record) =>
          ability.can('destroy', 'transaction_sheet') &&
          record.approval_status === TransactionSheetApprovalStatus.pending_confirm,
        variant: 'danger',
      },
    ],
    [navigate, handleApprove, handleReject, handleDelete, ability]
  )

  if (error) {
    return <TableError />
  }

  const handlePaginationChange = useCallback(
    (pageIndex: number, newPageSize: number) => onPageChange?.(pageIndex + 1, newPageSize),
    [onPageChange]
  )

  return (
    <Table
      className={`js-transaction-sheet-table ${className ? className : ''}`}
      columns={columns}
      data={data}
      isLoading={isLoading}
      totalRecords={totalRecords}
      pageSize={pageSize}
      manualPagination={true}
      currentPageIndex={Math.max((currentPage || 1) - 1, 0)}
      showSTT={true}
      showActions={true}
      rowActions={actions}
      pageCount={pageCount ?? 0}
      onPaginationChange={handlePaginationChange}
      paginationPosition="static"
      disableInnerOverflow={true}
      stickyHeader={stickyHeader}
    />
  )
}

export default TransactionSheetListTable
