import { FC, useMemo } from 'react'
import { Table, Chip, TextArea } from '@/components/ui'
import TableError from '@/components/ui/table/TableError'
import { ColumnDef, type RowSelectionState } from '@tanstack/react-table'
import { ColoredValueVariant } from '@/api/schema.ts'
import { Eye, Edit, Trash2, CheckCircle, XCircle } from 'lucide-react'
import { useNavigate, Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/hooks/useToast'
import {
  useDeleteRefundBooking,
  useApproveRefundBooking,
  useRejectRefundBooking,
  useAccountantApproveRefundBooking,
  useAdminLeadApproveRefundBooking,
  useConfirmRefundPayment,
  useConfirmRefundInvestorRecovery,
} from '@/features/project/refund-booking/hooks/useRefundBookings'
import type { BookingRefund } from '@/services/sales-service'
import {
  RefundBookingStatus,
  REFUND_APPROVABLE_STATUSES,
  REFUND_EDITABLE_STATUSES,
  REFUND_REJECTABLE_STATUSES,
} from '../constants/refund-booking-constants'
import { formatCurrencyVND } from '@/utils/common'
import { formatDateToApi } from '@/utils/date-utils'
import RefundPaymentForm, { type RefundPaymentFormValues } from './RefundPaymentForm'
import { REFUND_PAYMENT_ERROR, getRefundPaymentErrorCode } from '../types/refund-payment-types'
import { formatDate } from '@/utils/date-utils'
import { TableAction } from '@/types/table'
import { useAbility } from '@/lib/ability'
import useAppConstant from '@/hooks/useAppConstant'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import { useDialog } from '@/hooks/useDialog'
import { extractErrorMessage } from '@/utils/error-utils'

import { ReferenceCode } from '@/components/commons/ReferenceCode'
import { APP_PATH } from '@/routes/AppRoute.constant'
import { CustomerType as CustomerType } from '@/constants/api-schema-aliases'

interface RefundBookingTableProps {
  data: BookingRefund[]
  isLoading?: boolean
  error?: Error | null
  onPageChange?: (page: number, pageSize: number) => void
  pageCount?: number
  currentPage?: number
  totalRecords?: number
  pageSize?: number
  /** Bật cột checkbox cho luồng "Duyệt nhiều" (CR STT35). */
  selectionEnabled?: boolean
  /** Dòng nào tích được — trang chủ quản, vì luật phụ thuộc quyền của từng bàn duyệt. */
  isRowSelectable?: (row: BookingRefund) => boolean
  /** Lựa chọn khoá theo id nên giữ được qua nhiều trang; nguồn sự thật nằm ở trang. */
  rowSelection?: RowSelectionState
  onRowSelectionChange?: (next: RowSelectionState) => void
}

const getStatusVariant = (status: string): ColoredValueVariant => {
  switch (status) {
    case RefundBookingStatus.PENDING_CONFIRM:
    case RefundBookingStatus.PENDING_ADMIN:
    case RefundBookingStatus.PENDING_ADMIN_LEAD:
    case RefundBookingStatus.PENDING_ACCOUNTANT:
    case RefundBookingStatus.PENDING_TREASURER:
      return ColoredValueVariant.YELLOW
    case RefundBookingStatus.APPROVED:
    case RefundBookingStatus.COMPLETED:
      return ColoredValueVariant.GREEN
    case RefundBookingStatus.REJECTED:
      return ColoredValueVariant.RED
    default:
      return ColoredValueVariant.GREY
  }
}

const RefundBookingTable: FC<RefundBookingTableProps> = ({
  data,
  isLoading,
  error,
  onPageChange,
  pageCount = 1,
  currentPage = 1,
  totalRecords = 0,
  pageSize = 25,
  selectionEnabled = false,
  isRowSelectable,
  rowSelection,
  onRowSelectionChange,
}) => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const ability = useAbility()
  const { mutate: deleteRefund } = useDeleteRefundBooking()
  const { mutateAsync: approveRefund } = useApproveRefundBooking()
  const { mutateAsync: rejectRefund } = useRejectRefundBooking()
  const { mutateAsync: accountantApproveRefund } = useAccountantApproveRefundBooking()
  const { mutateAsync: adminLeadApproveRefund } = useAdminLeadApproveRefundBooking()
  const { mutateAsync: confirmRefundPayment } = useConfirmRefundPayment()
  const { mutateAsync: confirmInvestorRecovery } = useConfirmRefundInvestorRecovery()
  const toast = useToast()

  const { displayFormContent, displayConfirm, displayClose, setLoading } = useDialog()

  // `keysMap` (Record<value, label>) chứ không phải `keysMapOptions`: nhãn được tra một lần cho
  // MỖI DÒNG, `keysMapOptions.find()` là O(n) mỗi dòng — xem docs/ai § useAppConstant.
  const { keysMap } = useAppConstant({
    module: 'sales',
    keys: [APP_CONSTANT_KEY.SALES.BOOKING_REFUND.STATUS_CHOICES],
  })

  const statusLabels = useMemo(
    () =>
      (keysMap.get(APP_CONSTANT_KEY.SALES.BOOKING_REFUND.STATUS_CHOICES) ?? {}) as Record<
        string,
        string
      >,
    [keysMap]
  )

  type ApprovalAction = 'approve' | 'admin-lead-approve' | 'accountant-approve' | 'reject'

  /**
   * Bước chi tiền. Hai mã lỗi của BE cần UI riêng chứ không phải toast chung:
   * một cái phải mở tiếp một form, cái kia phải hỏi lại rồi gửi lại kèm cờ.
   * Đổ cả hai vào toast là bắt người dùng tự đoán phải làm gì tiếp.
   */
  const submitRefundPayment = async (
    item: BookingRefund,
    values: RefundPaymentFormValues,
    { confirmAccountMismatch = false }: { confirmAccountMismatch?: boolean } = {}
  ) => {
    try {
      await confirmRefundPayment({
        id: item.id,
        data: {
          paid_amount: String(values.paidAmount),
          paid_at: formatDateToApi(values.paidAt),
          mv_account_number: values.mvAccountNumber,
          mv_account_name: values.mvAccountName,
          mv_bank_name: values.mvBankName,
          bank_ref: values.bankRef,
          retained_reason: values.retainedReason || undefined,
          retained_note: values.retainedNote || undefined,
          note: values.note,
          confirm_account_mismatch: confirmAccountMismatch || undefined,
        },
      })
      displayClose()
      toast.success('Đã ghi nhận chi tiền hoàn')
      queryClient.invalidateQueries({ queryKey: ['sales', 'booking_refunds', 'list'] })
    } catch (error) {
      const code = getRefundPaymentErrorCode(error)

      if (code === REFUND_PAYMENT_ERROR.INVESTOR_RECOVERY_PENDING) {
        displayConfirm({
          title: 'Chưa đòi lại được tiền từ Chủ đầu tư',
          content:
            'Khoản này khách nộp thẳng cho Chủ đầu tư. Cần xác nhận đã đòi lại tiền từ CĐT trước khi chi.',
          confirmText: 'Xác nhận đã đòi lại',
          cancelText: 'Để sau',
          onConfirm: async () => {
            await confirmInvestorRecovery({
              id: item.id,
              data: { recovered_on: formatDateToApi(new Date()) },
            })
            toast.success('Đã ghi nhận đòi lại tiền từ CĐT. Mở lại "Xác nhận đã chi" để tiếp tục.')
            queryClient.invalidateQueries({ queryKey: ['sales', 'booking_refunds', 'list'] })
          },
        })
        return
      }

      if (code === REFUND_PAYMENT_ERROR.ACCOUNT_MISMATCH) {
        displayConfirm({
          title: 'Tài khoản nhận khác tài khoản khách đã chuyển',
          content:
            'Tài khoản nhận tiền hoàn không trùng với tài khoản khách đã chuyển tiền đi. Vẫn tiếp tục chi?',
          confirmText: 'Vẫn chi',
          cancelText: 'Xem lại',
          onConfirm: () => submitRefundPayment(item, values, { confirmAccountMismatch: true }),
        })
        return
      }

      toast.error('Không ghi nhận được việc chi tiền')
      throw error
    }
  }

  const handleConfirmPayment = (item: BookingRefund) => {
    displayFormContent({
      title: 'Xác nhận đã chi tiền',
      description: `Phiếu ${item.code}`,
      content: (
        <RefundPaymentForm
          approvedAmount={Number(item.refund_amount)}
          retainedAmount={Number((item as any).retained_amount ?? 0)}
          onSubmit={(values) => submitRefundPayment(item, values)}
          onCancel={displayClose}
        />
      ),
    })
  }

  const handleActionWithNote = (item: BookingRefund, action: ApprovalAction) => {
    let note = ''
    const isReject = action === 'reject'

    let title = 'Xác nhận xử lý'
    if (action === 'approve') title = 'Duyệt yêu cầu hoàn tiền'
    if (action === 'admin-lead-approve') title = 'Admin Lead duyệt yêu cầu'
    if (action === 'accountant-approve') title = 'Kế toán duyệt yêu cầu'
    if (isReject) title = 'Từ chối yêu cầu hoàn tiền'

    displayFormContent({
      title,
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
      confirmText: isReject ? 'Từ chối' : 'Duyệt',
      cancelText: 'Hủy',
      onConfirm: async () => {
        if (isReject && !note.trim()) {
          toast.error('Vui lòng nhập lý do từ chối')
          const err: any = new Error('Validation error')
          err.isValidationError = true
          throw err
        }
        try {
          setLoading(true)
          if (action === 'approve') {
            await approveRefund({ id: item.id, data: { note } })
          } else if (action === 'admin-lead-approve') {
            await adminLeadApproveRefund({ id: item.id, data: { is_approved: true, note } })
          } else if (action === 'accountant-approve') {
            await accountantApproveRefund({ id: item.id, data: { is_approved: true, note } })
          } else if (action === 'reject') {
            await rejectRefund({ id: item.id, data: { note } })
          }
          toast.success(`Đã xử lý thành công yêu cầu hoàn tiền`)
          displayClose()
          queryClient.invalidateQueries({ queryKey: ['sales', 'booking_refunds', 'list'] })
        } catch (err) {
          toast.error(extractErrorMessage(err, 'Có lỗi xảy ra khi xử lý'))
        } finally {
          setLoading(false)
        }
      },
    })
  }

  // Dùng `displayConfirm` của hệ dialog dùng chung, không phải `window.confirm` — hộp thoại
  // native không theo design system và bị chặn ở một số trình duyệt/iframe.
  const handleDelete = (id: number) => {
    displayConfirm({
      title: 'Xoá yêu cầu hoàn tiền',
      content: 'Bạn có chắc chắn muốn xóa yêu cầu hoàn tiền này không?',
      confirmText: 'Xoá',
      cancelText: 'Hủy',
      onConfirm: () => {
        deleteRefund(id, {
          onSuccess: () => {
            toast.success('Xóa yêu cầu hoàn tiền thành công')
            queryClient.invalidateQueries({ queryKey: ['sales', 'booking_refunds', 'list'] })
          },
          onError: () => {
            toast.error('Có lỗi xảy ra khi xóa yêu cầu hoàn tiền')
          },
        })
      },
    })
  }

  const columns: ColumnDef<BookingRefund>[] = [
    {
      header: 'Mã đề nghị',
      accessorKey: 'code',
      size: 180,
      cell: ({ row }) => (
        <ReferenceCode
          code={row.original.code}
          linkTo={APP_PATH.PROJECT_REFUND_BOOKING_DETAIL.replace(':id', String(row.original.id))}
        />
      ),
      meta: {
        align: 'left',
        width: 'w-[180px]',
      },
    },
    {
      // `id` chứ không phải `accessorKey`: serializer `BookingRefund` không có cột phẳng
      // `customer_name` — tên khách nằm trong `customer_detail.name`.
      id: 'customer',
      header: 'Khách hàng',
      size: 200,
      cell: ({ row }) => {
        const customer = row.original.customer_detail
        const name = customer?.name || '-'

        const isBusiness =
          customer?.customer_type === CustomerType.business ||
          row.original.cust_customer_type === CustomerType.business

        // `CustomerNested.identify_number` đã là MST với khách doanh nghiệp; `cust_business_tax_code`
        // là bản snapshot lưu trên phiếu, dùng khi khách gốc đã bị đổi/xoá.
        const taxCode = customer?.identify_number || row.original.cust_business_tax_code

        const linkElement = customer?.id ? (
          <Link
            to={APP_PATH.CUSTOMER_MANAGER_DETAIL.replace(':id', String(customer.id))}
            className="text-action-primary-default font-medium hover:underline"
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
          >
            {name}
          </Link>
        ) : (
          <span>{name}</span>
        )

        return (
          <div className="flex flex-col">
            {linkElement}
            {isBusiness && taxCode && (
              <span className="text-text-secondary mt-0.5 text-xs">MST: {taxCode}</span>
            )}
          </div>
        )
      },
      meta: {
        width: 'w-[200px]',
      },
    },
    {
      id: 'project',
      header: 'Dự án',
      size: 280,
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
      meta: {
        width: 'w-[280px]',
      },
    },
    {
      // Serializer trả SĐT ở `cust_phone` (snapshot trên phiếu); `CustomerNested` không có phone.
      id: 'phone',
      header: 'SĐT',
      size: 150,
      cell: ({ row }) => row.original.cust_phone || '-',
      meta: {
        width: 'w-[150px]',
      },
    },
    {
      header: 'Số tiền đặt chỗ',
      accessorKey: 'booking_amount',
      size: 180,
      cell: ({ row }) => formatCurrencyVND(row.original.booking_amount),
      meta: {
        width: 'w-[180px]',
      },
    },
    {
      header: 'Số tiền hoàn',
      accessorKey: 'refund_amount',
      size: 180,
      cell: ({ row }) => formatCurrencyVND(row.original.refund_amount),
      meta: {
        width: 'w-[180px]',
      },
    },
    {
      header: 'Ngày tạo',
      accessorKey: 'created_at',
      size: 180,
      cell: ({ row }) => formatDate(row.original.created_at, 'dd/MM/yyyy HH:mm'),
      meta: {
        width: 'w-[180px]',
      },
    },
    {
      header: 'Trạng thái',
      accessorKey: 'status',
      size: 180,
      cell: ({ row }) => {
        const status = row.original.status
        return (
          <Chip
            label={statusLabels[status] || 'Không xác định'}
            variant={getStatusVariant(status)}
            size="small"
          />
        )
      },
      meta: {
        width: 'w-[180px]',
      },
    },
  ]

  const actions = useMemo(
    (): TableAction<BookingRefund>[] => [
      {
        label: 'Xem chi tiết',
        icon: <Eye size={16} />,
        show: () => ability.can('retrieve', 'booking_refund'),
        onClick: (item) =>
          navigate(APP_PATH.PROJECT_REFUND_BOOKING_DETAIL.replace(':id', String(item.id))),
      },
      {
        label: 'Duyệt',
        icon: <CheckCircle size={16} />,
        show: (item) =>
          ability.can('approve', 'booking_refund') &&
          REFUND_APPROVABLE_STATUSES.includes(item.status),
        onClick: (item) => handleActionWithNote(item, 'approve'),
      },
      {
        label: 'Admin Lead Duyệt',
        icon: <CheckCircle size={16} />,
        show: (item) =>
          ability.can('admin_lead_approve', 'booking_refund') &&
          item.status === RefundBookingStatus.PENDING_ADMIN_LEAD,
        onClick: (item) => handleActionWithNote(item, 'admin-lead-approve'),
      },
      {
        label: 'Kế toán duyệt',
        icon: <CheckCircle size={16} />,
        show: (item) =>
          ability.can('accountant_approve', 'booking_refund') &&
          item.status === RefundBookingStatus.PENDING_ACCOUNTANT,
        onClick: (item) => handleActionWithNote(item, 'accountant-approve'),
      },
      {
        label: 'Xác nhận đã chi',
        icon: <CheckCircle size={16} />,
        show: (item) =>
          ability.can('confirm_payment', 'booking_refund') &&
          item.status === RefundBookingStatus.PENDING_TREASURER,
        onClick: (item) => handleConfirmPayment(item),
      },
      {
        label: 'Từ chối',
        icon: <XCircle size={16} />,
        variant: 'danger',
        show: (item) =>
          ability.can('reject', 'booking_refund') &&
          REFUND_REJECTABLE_STATUSES.includes(item.status),
        onClick: (item) => handleActionWithNote(item, 'reject'),
      },
      {
        label: 'Chỉnh sửa',
        icon: <Edit size={16} />,
        show: (item) =>
          ability.can('update', 'booking_refund') && REFUND_EDITABLE_STATUSES.includes(item.status),
        onClick: (item) =>
          navigate(APP_PATH.PROJECT_REFUND_BOOKING_EDIT.replace(':id', String(item.id))),
      },
      {
        label: 'Xóa',
        icon: <Trash2 size={16} />,
        variant: 'danger',
        show: (item) =>
          ability.can('destroy', 'booking_refund') &&
          item.status === RefundBookingStatus.PENDING_CONFIRM,
        onClick: (item) => handleDelete(item.id),
      },
    ],
    [
      navigate,
      deleteRefund,
      queryClient,
      toast,
      ability,
      approveRefund,
      adminLeadApproveRefund,
      accountantApproveRefund,
      rejectRefund,
      displayFormContent,
      displayClose,
      setLoading,
    ]
  )

  if (error) {
    return <TableError />
  }

  return (
    <Table<BookingRefund>
      bordered={false}
      columns={columns}
      data={data}
      isLoading={isLoading}
      showActions
      rowActions={actions}
      manualPagination
      pageCount={pageCount}
      currentPageIndex={(currentPage || 1) - 1}
      pageSize={pageSize}
      totalRecords={totalRecords}
      enableRowSelection={selectionEnabled ? (row) => !!isRowSelectable?.(row.original) : false}
      getRowId={(row) => String(row.id)}
      rowSelection={selectionEnabled ? rowSelection : undefined}
      onRowSelectionChange={selectionEnabled ? onRowSelectionChange : undefined}
      onPaginationChange={(index: number, size: number) => onPageChange?.(index + 1, size)}
      // Bộ ba của trang danh sách: `static` là nhánh DUY NHẤT dựng `HorizontalScrollBar` + phân
      // trang ghim đáy; `disableInnerOverflow` để khung cuộn nằm ở div bọc ngoài của trang (thiếu
      // nó là có hai thanh cuộn ngang chồng nhau); `stickyHeader` giữ hàng tiêu đề đứng yên.
      paginationPosition="static"
      disableInnerOverflow
      stickyHeader
    />
  )
}

export default RefundBookingTable
