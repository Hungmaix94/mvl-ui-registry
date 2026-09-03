import { FC, useMemo } from 'react'
import { Table, Chip } from '@/components/ui'
import { ReferenceCode } from '@/components/commons'
import TableError from '@/components/ui/table/TableError'
import { ColumnDef } from '@tanstack/react-table'
import { TableAction } from '@/types/table'
import { ColoredValueVariant } from '@/api/schema'
import { DepositContractApprovalStatus } from '@/constants/api-schema-aliases'
import { IconEye, IconPencilsimple, IconTrash, IconArrowcounterclockwise } from '@/assets/icons'
import { useNavigate, Link } from 'react-router-dom'
import { APP_PATH } from '@/routes'
import {
  Booking,
  useDeleteBooking,
  useApproveBooking,
  useRejectBooking,
  useAccountantApproveBooking,
  useAdminLeadApproveBooking,
} from '@/services/sales-service'
import { formatCurrencyVND } from '@/utils/common'
import { formatDate } from '@/utils/date-utils'
import { extractErrorMessage } from '@/utils/error-utils'
import { useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/hooks/useToast'
import { useDialog } from '@/hooks/useDialog'
import { TextArea } from '@/components/ui'
import { IconCheck, IconX } from '@/assets/icons'
import {
  BookingContractStatus,
  BOOKING_APPROVAL_STATUS_OPTIONS,
} from '../types/booking-contract-types'
import useAppConstant from '@/hooks/useAppConstant'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import { useAbility } from '@/lib/ability'

interface BookingContractTableProps {
  data: Booking[]
  isLoading?: boolean
  onPaginationChange?: (pageIndex: number, pageSize: number) => void
  onSortingChange?: (field: string, direction: 'asc' | 'desc' | null) => void
  pageCount?: number
  currentPage?: number
  pageSize?: number
  totalRecords?: number
  error?: unknown
  enableRowSelection?: boolean | ((row: import('@tanstack/react-table').Row<Booking>) => boolean)
  onSelectionChange?: (selectedRows: Booking[]) => void
  /**
   * Lựa chọn khoá theo id (CR STT35 — "Duyệt nhiều"), giữ được qua nhiều trang.
   *
   * Khác `onSelectionChange` ở trên: cái đó trả về mảng bản ghi của TRANG hiện tại, sang trang
   * là mất. Truyền cặp `rowSelection`/`onRowSelectionChange` thì nguồn sự thật nằm ở trang và
   * tồn tại xuyên trang.
   */
  rowSelection?: import('@tanstack/react-table').RowSelectionState
  onRowSelectionChange?: (next: import('@tanstack/react-table').RowSelectionState) => void
  customRowActions?: TableAction<Booking>[]
  className?: string
  paginationPosition?: 'fixed' | 'static' | 'inline'
  /**
   * Giữ hàng tiêu đề đứng yên khi cuộn dọc. Chỉ bật ở trang danh sách — bảng này còn nhúng trong
   * tab của màn Chi tiết bất động sản, nơi không có khung cuộn riêng để ghim vào.
   */
  stickyHeader?: boolean
  /**
   * Tắt overflow bên trong `Table` để khung cuộn nằm ở div bọc ngoài của trang.
   *
   * BẮT BUỘC đi kèm `paginationPosition="static"` (AGENTS.md): thiếu nó thì có **hai** thanh cuộn
   * ngang chồng nhau; còn để mặc định `"fixed"` thì `Table` không dựng `HorizontalScrollBar` và
   * viewport của Radix ScrollArea giấu luôn thanh cuộn native ⇒ không có thanh kéo ngang nào,
   * các cột cuối im lặng biến mất.
   */
  disableInnerOverflow?: boolean
  /** Ẩn cột "Dự án" khi bảng đã nằm trong ngữ cảnh 1 dự án (vd: chi tiết bất động sản). */
  showProjectColumn?: boolean
}

const getStatusVariant = (status: BookingContractStatus | string): ColoredValueVariant => {
  switch (status) {
    case BookingContractStatus.NEW:
      return ColoredValueVariant.BLUE
    case BookingContractStatus.PENDING_APPROVAL:
      return ColoredValueVariant.YELLOW
    case BookingContractStatus.BOOKED:
      return ColoredValueVariant.GREEN
    case BookingContractStatus.REFUNDED:
      return ColoredValueVariant.RED
    case BookingContractStatus.CONVERTED_DEPOSIT:
      return ColoredValueVariant.BLUE
    case BookingContractStatus.TRANSFERRED:
      return ColoredValueVariant.PURPLE
    default:
      return ColoredValueVariant.GREY
  }
}

const getApprovalStatusVariant = (status: string): ColoredValueVariant => {
  switch (status) {
    case 'new':
    case 'draft':
      return ColoredValueVariant.BLUE
    case 'pending_admin':
    case 'pending_accountant':
    case 'pending_manager':
    case 'pending_admin_lead':
    case 'pending_approval':
    case 'pending':
    case 'pending_confirm':
      return ColoredValueVariant.YELLOW
    case 'approved':
      return ColoredValueVariant.GREEN
    case 'rejected':
      return ColoredValueVariant.RED
    default:
      return ColoredValueVariant.GREY
  }
}

const BookingContractTable: FC<BookingContractTableProps> = ({
  data,
  isLoading,
  onPaginationChange,
  onSortingChange,
  pageCount = 1,
  currentPage = 1,
  pageSize,
  totalRecords,
  error,
  enableRowSelection,
  onSelectionChange,
  rowSelection,
  onRowSelectionChange,
  customRowActions,
  className,
  paginationPosition,
  stickyHeader = false,
  disableInnerOverflow = false,
  showProjectColumn = true,
}) => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const ability = useAbility()
  const { mutate: deleteBooking } = useDeleteBooking()
  const { mutateAsync: approveBooking } = useApproveBooking()
  const { mutateAsync: accountantApproveBooking } = useAccountantApproveBooking()
  const { mutateAsync: adminLeadApproveBooking } = useAdminLeadApproveBooking()
  const { mutateAsync: rejectBooking } = useRejectBooking()

  const { keysMapOptions } = useAppConstant({
    module: 'sales',
    keys: [
      APP_CONSTANT_KEY.SALES.BOOKING.BOOKING_STATUS_CHOICES,
      APP_CONSTANT_KEY.SALES.BOOKING.APPROVAL_STATUS_CHOICES,
    ],
  })

  const statusOptions = useMemo(
    () => keysMapOptions.get(APP_CONSTANT_KEY.SALES.BOOKING.BOOKING_STATUS_CHOICES) || [],
    [keysMapOptions]
  )

  const approvalStatusOptions = useMemo(() => {
    const options = keysMapOptions.get(APP_CONSTANT_KEY.SALES.BOOKING.APPROVAL_STATUS_CHOICES) || []
    return options.length > 0 ? options : BOOKING_APPROVAL_STATUS_OPTIONS
  }, [keysMapOptions])

  const { displayFormContent, displayClose, setLoading, displayConfirm } = useDialog()
  const toast = useToast()

  const handleDelete = (id: number) => {
    displayConfirm({
      title: 'Xác nhận xóa',
      description: 'Bạn có chắc chắn muốn xóa hợp đồng này không?',
      onConfirm: async () => {
        deleteBooking(id, {
          onSuccess: () => {
            toast.success('Xóa hợp đồng thành công')
            queryClient.invalidateQueries({ queryKey: ['sales', 'bookings', 'list'] })
            displayClose()
          },
          onError: () => {
            toast.error('Có lỗi xảy ra khi xóa hợp đồng')
          },
        })
      },
      confirmText: 'Xóa',
      cancelText: 'Hủy',
    })
  }

  const openApprovalModal = (
    item: Booking,
    action:
      | 'approve'
      | 'accountant_approve'
      | 'admin_lead_approve'
      | 'reject_accountant'
      | 'reject_admin'
      | 'reject_admin_lead'
      | 'reject'
  ) => {
    let note = ''

    const actionConfig = {
      approve: { title: 'Xác nhận phê duyệt', confirmText: 'Phê duyệt', actionName: 'phê duyệt' },
      accountant_approve: {
        title: 'Kế toán phê duyệt',
        confirmText: 'Xác nhận',
        actionName: 'phê duyệt (kế toán)',
      },
      admin_lead_approve: {
        title: 'Quản lý xác nhận',
        confirmText: 'Xác nhận',
        actionName: 'quản lý xác nhận',
      },
      reject_accountant: {
        title: 'Kế toán từ chối',
        confirmText: 'Từ chối',
        actionName: 'kế toán từ chối',
      },
      reject_admin: { title: 'Admin từ chối', confirmText: 'Từ chối', actionName: 'admin từ chối' },
      reject_admin_lead: {
        title: 'Quản lý từ chối',
        confirmText: 'Từ chối',
        actionName: 'quản lý từ chối',
      },
      reject: { title: 'Xác nhận từ chối', confirmText: 'Từ chối', actionName: 'từ chối' },
    }

    const config = actionConfig[action]

    displayFormContent({
      title: config.title,
      description: 'Vui lòng nhập ghi chú cho quyết định này',
      content: (
        <div className="p-4">
          <TextArea
            label="Ghi chú"
            placeholder="Nhập lý do/ghi chú..."
            onChange={(value) => {
              note = value
            }}
            rows={4}
          />
        </div>
      ),
      confirmText: config.confirmText,
      cancelText: 'Hủy',
      onConfirm: async () => {
        if (action.startsWith('reject') && !note.trim()) {
          toast.error('Vui lòng nhập lý do từ chối')
          return
        }
        try {
          setLoading(true)
          if (action === 'approve') {
            await approveBooking({ id: item.id, data: { note, is_approved: true } })
          } else if (action === 'accountant_approve') {
            await accountantApproveBooking({ id: item.id, data: { note, is_approved: true } })
          } else if (action === 'admin_lead_approve') {
            await adminLeadApproveBooking({ id: item.id, data: { note, is_approved: true } })
          } else if (action === 'reject_accountant') {
            await accountantApproveBooking({ id: item.id, data: { note, is_approved: false } })
          } else if (action === 'reject_admin') {
            await approveBooking({ id: item.id, data: { note, is_approved: false } })
          } else if (action === 'reject_admin_lead') {
            await adminLeadApproveBooking({ id: item.id, data: { note, is_approved: false } })
          } else if (action === 'reject') {
            await rejectBooking({ id: item.id, data: { note } })
          }
          toast.success(`Đã ${config.actionName} thành công hợp đồng`)
          displayClose()
          queryClient.invalidateQueries({ queryKey: ['sales', 'bookings', 'list'] })
        } catch (err) {
          toast.error(extractErrorMessage(err, 'Có lỗi xảy ra khi xử lý'))
        } finally {
          setLoading(false)
        }
      },
    })
  }

  const projectColumn: ColumnDef<Booking> = {
    id: 'project',
    header: 'Dự án',
    size: 280,
    meta: { width: 'w-[280px]' },
    cell: ({ row }) => {
      const detail = row.original.project_detail
      if (!detail?.name) return '-'
      return (
        <Link
          to={APP_PATH.PROJECT_MANAGEMENT_DETAIL.replace(':id', String(detail.id))}
          className="text-action-primary-default font-medium hover:underline"
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
        >
          {detail.name}
        </Link>
      )
    },
  }

  const columns: ColumnDef<Booking>[] = [
    {
      header: 'Mã hợp đồng',
      accessorKey: 'code',
      size: 180,
      meta: { sortable: true, width: 'w-[180px]' },
      cell: ({ row }) => (
        <ReferenceCode
          code={row.getValue('code') as string}
          linkTo={APP_PATH.PROJECT_BOOKING_CONTRACT_DETAIL.replace(':id', String(row.original.id))}
        />
      ),
    },
    {
      header: 'Mã phiếu đặt cọc',
      accessorKey: 'contract_number',
      size: 150,
      meta: { sortable: true, width: 'w-[150px]' },
      cell: ({ row }) => row.original.contract_number || '-',
    },
    {
      header: 'Tên khách hàng',
      accessorKey: 'customer_detail.name',
      size: 200,
      meta: { width: 'w-[200px]' },
      cell: ({ row }) => {
        const customer = row.original.customer_detail
        const name =
          row.original.cust_full_name || row.original.cust_business_name || customer?.name || ''
        if (customer?.id) {
          return (
            <Link
              to={APP_PATH.CUSTOMER_MANAGER_DETAIL.replace(':id', String(customer.id))}
              className="text-action-primary-default font-medium hover:underline"
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
            >
              {name}
            </Link>
          )
        }
        return name || '-'
      },
    },
    ...(showProjectColumn ? [projectColumn] : []),
    {
      accessorKey: 'product_inventory_detail.code',
      header: 'Mã bất động sản',
      size: 180,
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
      meta: { align: 'left', width: 'w-[180px]' },
    },
    {
      header: 'Ngày đặt chỗ',
      accessorKey: 'booking_date',
      size: 160,
      meta: { sortable: true, width: 'w-[160px]' },
      cell: ({ row }) => formatDate(row.getValue('booking_date'), 'dd/MM/yyyy'),
    },
    {
      header: 'Số tiền thanh toán',
      accessorKey: 'payment_amount',
      size: 180,
      meta: { sortable: true, width: 'w-[180px]' },
      cell: ({ row }) => formatCurrencyVND(parseFloat(row.getValue('payment_amount')) || 0),
    },
    {
      header: 'Trạng thái',
      accessorKey: 'booking_status',
      size: 180,
      meta: { width: 'w-[180px]' },
      cell: ({ row }) => {
        const status = row.getValue('booking_status') as string
        const label = String(
          statusOptions.find((o) => o.value === status)?.label || 'Không xác định'
        )
        return <Chip label={label} variant={getStatusVariant(status)} size="small" />
      },
    },
    {
      header: 'Trạng thái phê duyệt',
      accessorKey: 'approval_status',
      size: 220,
      meta: { width: 'w-[220px]' },
      cell: ({ row }) => {
        const status = row.getValue('approval_status') as string
        const label = String(
          approvalStatusOptions.find((o) => o.value === status)?.label || 'Không xác định'
        )
        return <Chip label={label} variant={getApprovalStatusVariant(status)} size="small" />
      },
    },
  ]

  const actions: TableAction<Booking>[] = useMemo(
    () => [
      {
        label: 'Xem chi tiết',
        icon: <IconEye size={16} />,
        show: () => ability.can('retrieve', 'booking'),
        onClick: (item) =>
          navigate(APP_PATH.PROJECT_BOOKING_CONTRACT_DETAIL.replace(':id', String(item.id))),
      },
      {
        label: 'Kế toán phê duyệt',
        icon: <IconCheck size={16} />,
        show: (item) =>
          ability.can('accountant_approve', 'booking') &&
          item.approval_status === DepositContractApprovalStatus.pending_accountant,
        onClick: (item) => openApprovalModal(item, 'accountant_approve'),
      },
      {
        label: 'Admin phê duyệt',
        icon: <IconCheck size={16} />,
        show: (item) =>
          ability.can('approve', 'booking') &&
          item.approval_status === DepositContractApprovalStatus.pending_admin,
        onClick: (item) => openApprovalModal(item, 'approve'),
      },
      {
        label: 'Quản lý xác nhận',
        icon: <IconCheck size={16} />,
        show: (item) =>
          ability.can('admin_lead_approve', 'booking') &&
          (item.approval_status === DepositContractApprovalStatus.pending_admin_lead ||
            item.approval_status === (DepositContractApprovalStatus.pending_manager as any)),
        onClick: (item) => openApprovalModal(item, 'admin_lead_approve'),
      },
      {
        label: 'Kế toán từ chối',
        icon: <IconX size={16} />,
        show: (item) =>
          ability.can('accountant_approve', 'booking') &&
          item.approval_status === DepositContractApprovalStatus.pending_accountant,
        onClick: (item) => openApprovalModal(item, 'reject_accountant'),
      },
      {
        label: 'Admin từ chối',
        icon: <IconX size={16} />,
        show: (item) =>
          ability.can('approve', 'booking') &&
          item.approval_status === DepositContractApprovalStatus.pending_admin,
        onClick: (item) => openApprovalModal(item, 'reject_admin'),
      },
      {
        label: 'Quản lý từ chối',
        icon: <IconX size={16} />,
        show: (item) =>
          ability.can('admin_lead_approve', 'booking') &&
          (item.approval_status === DepositContractApprovalStatus.pending_admin_lead ||
            item.approval_status === (DepositContractApprovalStatus.pending_manager as any)),
        onClick: (item) => openApprovalModal(item, 'reject_admin_lead'),
      },
      {
        label: 'Yêu cầu hoàn tiền',
        icon: <IconArrowcounterclockwise size={16} />,
        show: (item) =>
          ability.can('create', 'booking_refund') &&
          (item.booking_status as string) === BookingContractStatus.BOOKED,
        onClick: (item) =>
          navigate(APP_PATH.PROJECT_BOOKING_CONTRACT_REFUND.replace(':id', String(item.id))),
      },

      {
        label: 'Chỉnh sửa',
        icon: <IconPencilsimple size={16} />,
        show: () => ability.can('update', 'booking'),
        // Gate on approval_status: a REJECTED booking is rewound to the previous
        // editor and stays editable; only the frozen desks are read-only —
        // approved (finalized) and pending_accountant (BE blocks PATCH with 400).
        disabled: (item: Booking) =>
          item.approval_status === DepositContractApprovalStatus.approved ||
          item.approval_status === DepositContractApprovalStatus.pending_accountant,
        onClick: (item) =>
          navigate(APP_PATH.PROJECT_BOOKING_CONTRACT_EDIT.replace(':id', String(item.id))),
      },
      {
        label: 'Xóa',
        icon: <IconTrash size={16} />,
        variant: 'danger',
        show: () => ability.can('destroy', 'booking'),
        disabled: (item: Booking) =>
          (item.booking_status as string) !== BookingContractStatus.PENDING_APPROVAL,
        onClick: (item) => handleDelete(item.id),
      },
    ],
    [
      ability,
      navigate,
      deleteBooking,
      queryClient,
      toast,
      approveBooking,
      accountantApproveBooking,
      adminLeadApproveBooking,
      rejectBooking,
      displayFormContent,
      displayClose,
      setLoading,
      displayConfirm,
    ]
  )

  if (error) return <TableError />

  return (
    <Table<Booking>
      bordered={false}
      className={className}
      paginationPosition={paginationPosition}
      stickyHeader={stickyHeader}
      disableInnerOverflow={disableInnerOverflow}
      columns={columns}
      data={data}
      isLoading={isLoading}
      showActions
      rowActions={[...(customRowActions || []), ...actions]}
      manualPagination
      pageCount={pageCount}
      currentPageIndex={(currentPage || 1) - 1}
      onPaginationChange={onPaginationChange}
      pageSize={pageSize}
      enableSorting
      manualSorting
      onSortingChange={onSortingChange}
      enableRowSelection={enableRowSelection}
      onSelectionChange={onSelectionChange}
      // `getRowId` chỉ bật ở chế độ controlled: nó đổi khoá selection từ index sang id, và bảng
      // này còn dùng ở màn Chi tiết bất động sản theo đường `onSelectionChange` (index-keyed).
      getRowId={rowSelection ? (row) => String(row.id) : undefined}
      rowSelection={rowSelection}
      onRowSelectionChange={onRowSelectionChange}
      totalRecords={totalRecords}
    />
  )
}

export default BookingContractTable
