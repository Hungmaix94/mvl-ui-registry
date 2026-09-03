import { useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import type { RowSelectionState } from '@tanstack/react-table'
import { IconEye, IconPencilsimple, IconTrash } from '@/assets/icons'
import { Undo, Mail, Ban, FileText, List } from 'lucide-react'
import { type ColumnDef, Table, type TableAction, Chip } from '@/components/ui'
import TableError from '@/components/ui/table/TableError'
import { BlockerList, ReferenceCode } from '@/components/commons'
import { APP_PATH } from '@/routes'
import { ColoredValueVariant } from '@/api/schema.ts'
import { DepositContractApprovalStatus } from '@/constants/api-schema-aliases.ts'
import {
  DepositContract,
  DepositStatus,
  useApproveDepositContract,
  useRejectDepositContract,
  useDeleteDepositContract,
  useAdminLeadApproveDepositContract,
  useAccountantApproveDepositContract,
  useAbandonDepositContract,
  useRefundDepositContract,
  usePreviewReclaimedDepositEmail,
  useSendReclaimedDepositEmail,
} from '@/features/sales/deposit-contracts/services/deposit-contract-service'
import { extractReclaimedEmailWarnings } from '@/features/sales/deposit-contracts/utils/reclaimed-email-warnings'
import { getDepositApprovalStatusVariant } from '@/features/sales/deposit-contracts/utils/approval-status'
import { getTotalDepositAmount } from '@/features/sales/deposit-contracts/utils/deposit-amount'
import { useStickyTableHeader } from '@/hooks/useStickyTableHeader'
import { QUERY_KEYS } from '@/constants'
import { formatCurrencyVND } from '@/utils/common'
import { extractBlockers, extractErrorMessage, extractFieldErrorDetail } from '@/utils/error-utils'
import { format } from 'date-fns'
import { useDialog } from '@/hooks/useDialog'
import { useToast } from '@/hooks/useToast'
import { useQueryClient } from '@tanstack/react-query'
import {
  DepositContractActionForm,
  DepositContractActionFormValues,
} from './DepositContractActionForm'
import { IconCheck, IconX } from '@/assets/icons'
import { IconClockcounterclockwise } from '@/assets/icons/time'
import useAppConstant from '@/hooks/useAppConstant'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import { useAbility } from '@/lib/ability'

const STATUS_VARIANTS: Record<string, ColoredValueVariant> = {
  [DepositStatus.NEW]: ColoredValueVariant.BLUE,
  [DepositStatus.PENDING_CONFIRM]: ColoredValueVariant.ORANGE,
  [DepositStatus.PENDING_MANAGER]: ColoredValueVariant.ORANGE,
  [DepositStatus.PENDING_ACCOUNTANT]: ColoredValueVariant.ORANGE,
  [DepositStatus.PENDING_APPROVAL]: ColoredValueVariant.ORANGE,
  [DepositStatus.APPROVED]: ColoredValueVariant.GREEN,
  [DepositStatus.REJECTED]: ColoredValueVariant.RED,
}

/** Lớp neo cho `useStickyTableHeader` — phải riêng cho từng bảng, tránh bắt nhầm
 *  container của module khác trên trang có nhiều bảng. Đi kèm `className` của `Table`
 *  bên dưới; lệch nhau là header thôi ghim mà không báo lỗi. */
const TABLE_SCOPE_CLASS = 'js-deposit-contract-table'

type DepositContractListTableProps = {
  data: DepositContract[]
  isLoading: boolean
  error?: Error | null
  totalRecords?: number
  pageSize?: number
  currentPageIndex?: number
  onPaginationChange?: (pageIndex: number, pageSize: number) => void
  refreshData?: () => void
  onClearFilter?: () => void
  hasFilter?: boolean
  /** Bật cột checkbox cho luồng "Duyệt nhiều" (CR STT35). */
  selectionEnabled?: boolean
  /** Dòng nào tích được — trang chủ quản, vì luật phụ thuộc quyền của từng bàn duyệt. */
  isRowSelectable?: (row: DepositContract) => boolean
  /** Lựa chọn khoá theo id nên giữ được qua nhiều trang; nguồn sự thật nằm ở trang. */
  rowSelection?: RowSelectionState
  onRowSelectionChange?: (next: RowSelectionState) => void
}

export const DepositContractListTable = ({
  data,
  isLoading,
  error,
  totalRecords = 0,
  pageSize = 25,
  currentPageIndex = 0,
  onPaginationChange,
  refreshData,
  onClearFilter,
  hasFilter,
  selectionEnabled = false,
  isRowSelectable,
  rowSelection,
  onRowSelectionChange,
}: DepositContractListTableProps) => {
  const navigate = useNavigate()

  // Ghim `<thead>` dưới navbar khi cuộn dọc. `position: sticky` thuần không ăn ở đây:
  // Radix bọc `Table.Root` trong `.rt-ScrollAreaViewport` có `overflow: scroll`, nên header
  // neo vào một hộp không bao giờ trượt. Truyền `data` để re-sync khi đổi trang.
  useStickyTableHeader(`.${TABLE_SCOPE_CLASS}`, data)
  const toast = useToast()
  const queryClient = useQueryClient()
  const ability = useAbility()
  const { displayFormContent, displayClose, setLoading, displayConfirm, displayCustom } =
    useDialog()

  const { mutateAsync: approveDoc } = useApproveDepositContract()
  const { mutateAsync: rejectDepositContract } = useRejectDepositContract()
  const { mutateAsync: deleteDepositContract } = useDeleteDepositContract()
  const { mutateAsync: adminLeadApprove } = useAdminLeadApproveDepositContract()
  const { mutateAsync: accountantApprove } = useAccountantApproveDepositContract()
  const { mutateAsync: abandonDepositContract } = useAbandonDepositContract()
  const { mutateAsync: refundDepositContract } = useRefundDepositContract()
  const { mutateAsync: previewReclaimedDepositEmail } = usePreviewReclaimedDepositEmail()
  const { mutateAsync: sendReclaimedDepositEmail } = useSendReclaimedDepositEmail()

  const { keysMap } = useAppConstant({
    module: 'sales',
    keys: [
      APP_CONSTANT_KEY.SALES.DEPOSIT_CONTRACT.STATUS_CHOICES,
      APP_CONSTANT_KEY.SALES.DEPOSIT_CONTRACT.APPROVAL_STATUS_CHOICES,
    ],
  })

  const statusLabels =
    (keysMap.get(APP_CONSTANT_KEY.SALES.DEPOSIT_CONTRACT.STATUS_CHOICES) as Record<
      string,
      string
    >) || {}

  // The two columns draw from different choice sets. STATUS_CHOICES has no entry
  // for the five `pending_*` approval stages, so labelling the approval column
  // from it renders raw enum keys ("pending_manager") for those rows.
  const approvalStatusLabels =
    (keysMap.get(APP_CONSTANT_KEY.SALES.DEPOSIT_CONTRACT.APPROVAL_STATUS_CHOICES) as Record<
      string,
      string
    >) || {}

  const openApprovalModal = (
    item: DepositContract,
    action:
      | 'approve'
      | 'reject'
      | 'admin-lead-approve'
      | 'admin-lead-reject'
      | 'accountant-approve'
      | 'accountant-reject'
      | 'abandon'
      | 'refund'
  ) => {
    let title = ''
    let confirmText = ''
    let actionName = ''
    let requireNote = false

    const actionMap: Record<
      typeof action,
      {
        title: string
        confirmText: string
        actionName: string
        requireNote?: boolean
        showRefundAmount?: boolean
      }
    > = {
      approve: {
        title: 'Phê duyệt hợp đồng cọc',
        confirmText: 'Phê duyệt',
        actionName: 'phê duyệt',
      },
      reject: {
        title: 'Từ chối hợp đồng cọc',
        confirmText: 'Từ chối',
        actionName: 'từ chối',
        requireNote: true,
      },
      'admin-lead-approve': {
        title: 'Xác nhận (Trưởng nhóm Admin)',
        confirmText: 'Xác nhận',
        actionName: 'xác nhận',
      },
      'admin-lead-reject': {
        title: 'Từ chối (Trưởng nhóm Admin)',
        confirmText: 'Từ chối',
        actionName: 'từ chối',
        requireNote: true,
      },
      'accountant-approve': {
        title: 'Kế toán phê duyệt',
        confirmText: 'Phê duyệt',
        actionName: 'kế toán phê duyệt',
      },
      'accountant-reject': {
        title: 'Kế toán từ chối',
        confirmText: 'Từ chối',
        actionName: 'kế toán từ chối',
        requireNote: true,
      },
      abandon: {
        title: 'Hủy hợp đồng cọc',
        confirmText: 'Hủy bỏ',
        actionName: 'hủy hợp đồng',
        requireNote: true,
      },
      refund: {
        title: 'Hoàn tiền hợp đồng',
        confirmText: 'Hoàn tiền',
        actionName: 'hoàn tiền',
        requireNote: true,
        showRefundAmount: true,
      },
    }

    const cfg = actionMap[action]
    title = cfg.title
    confirmText = cfg.confirmText
    actionName = cfg.actionName
    requireNote = cfg.requireNote ?? false

    displayFormContent({
      title,
      content: (
        <DepositContractActionForm
          requireNote={requireNote}
          showRefundAmount={cfg.showRefundAmount}
          // Cả hai prop là TỔNG cọc do BE trả (`total_deposit_amount`, từ 25/08/2026) — FE
          // KHÔNG cộng lại, xem `getTotalDepositAmount`. Riêng `totalDepositAmount` trước
          // 24/08/2026 còn không được truyền, nên khối "Lý do giữ lại" không bao giờ hiện ở màn
          // danh sách và hoàn thiếu luôn ăn 400 `retained_reason` mà người dùng không có ô nào
          // để điền (ClickUp 86eyqjbtb).
          maxRefundAmount={getTotalDepositAmount(item)}
          totalDepositAmount={getTotalDepositAmount(item)}
          confirmText={confirmText}
          onCancel={() => displayClose()}
          onSubmit={async (data: DepositContractActionFormValues) => {
            const runAction = async (confirmUnpaidReconciliation?: boolean) => {
              if (action === 'approve') {
                await approveDoc({ id: item.id, note: data.note })
              } else if (action === 'reject') {
                await rejectDepositContract({ id: item.id, note: data.note })
              } else if (action === 'admin-lead-approve') {
                await adminLeadApprove({ id: item.id, isApproved: true, note: data.note })
              } else if (action === 'admin-lead-reject') {
                await adminLeadApprove({ id: item.id, isApproved: false, note: data.note })
              } else if (action === 'accountant-approve') {
                await accountantApprove({ id: item.id, isApproved: true, note: data.note })
              } else if (action === 'accountant-reject') {
                await accountantApprove({ id: item.id, isApproved: false, note: data.note })
              } else if (action === 'abandon') {
                await abandonDepositContract({
                  id: item.id,
                  note: data.note,
                  confirmUnpaidReconciliation,
                })
              } else if (action === 'refund') {
                await refundDepositContract({
                  id: item.id,
                  note: data.note,
                  refunded_amount: data.refundedAmount,
                  confirmUnpaidReconciliation,
                  // Khối tài khoản khách nhận là BẮT BUỘC ở BE (`DepositRefundSerializer`,
                  // cả ba field `required=True`). Trước 24/08/2026 màn danh sách bỏ quên chúng
                  // nên form bắt người dùng điền rồi vứt đi — lệnh hoàn tiền từ danh sách luôn
                  // ăn 400, trong khi cùng form đó gọi từ màn chi tiết lại gửi đủ
                  // (ClickUp 86eyqjbtb).
                  refund_payee_account_name: data.refundPayeeAccountName,
                  refund_payee_account_number: data.refundPayeeAccountNumber,
                  refund_payee_bank_name: data.refundPayeeBankName,
                  retained_reason: data.retainedReason,
                  retained_note: data.retainedNote,
                })
              }
            }

            const finishSuccess = () => {
              toast.success(`Đã ${actionName} thành công`)
              displayClose()
              queryClient.invalidateQueries({ queryKey: ['sales', 'deposit-contracts', 'list'] })
              queryClient.invalidateQueries({
                queryKey: QUERY_KEYS.REALESTATE.PRODUCT_INVENTORIES.LIST({}),
              })
              queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SALES.BOOKINGS.LIST({}) })
              if (refreshData) {
                refreshData()
              }
            }

            try {
              setLoading(true)
              await runAction()
              finishSuccess()
            } catch (err: any) {
              // Bug 86expaf56: hóa đơn đầu ra của deal đã xuất hoặc đã thu tiền → chặn cứng
              // (400 kèm code invoice_blocked + blockers[]). Hiện danh sách vì toast chỉ có câu
              // tóm tắt, mất mã hóa đơn và việc cần làm. Chạy TRƯỚC cảnh báo mềm — cờ xác nhận
              // không vượt được chặn này.
              const invoiceBlockers = extractBlockers(err)
              if (invoiceBlockers.length > 0) {
                displayClose()
                displayCustom({
                  title: 'Chưa kết thúc được hợp đồng cọc',
                  size: 'lg',
                  hideFooter: true,
                  content: (
                    <BlockerList
                      heading="Chưa hoàn / huỷ được hợp đồng cọc vì"
                      items={invoiceBlockers}
                    />
                  ),
                })
                return
              }

              // Deal có đối chiếu CĐT/F2/CTV đã xác nhận nhưng chưa thanh toán — cảnh báo mềm
              // (400 kèm attr confirm_unpaid_reconciliation), chỉ áp dụng cho abandon/refund.
              // Hỏi lại người dùng, xác nhận thì gửi lại kèm cờ true.
              const reconciliationWarning =
                (action === 'abandon' || action === 'refund') &&
                extractFieldErrorDetail(err, 'confirm_unpaid_reconciliation')
              if (reconciliationWarning) {
                displayClose()
                displayConfirm({
                  title: 'Deal đang có đối chiếu đã xác nhận',
                  content: reconciliationWarning,
                  confirmText,
                  cancelText: 'Huỷ',
                  onConfirm: async () => {
                    try {
                      setLoading(true)
                      await runAction(true)
                      finishSuccess()
                    } catch (err2) {
                      // Error toast already shown by the mutation hooks (showErrorToast: true).
                      console.error(err2)
                    } finally {
                      setLoading(false)
                    }
                  },
                })
                return
              }

              // Căn đã có hợp đồng cọc khác còn hiệu lực — xem DepositContractDetailPage.
              const unitConflict = extractFieldErrorDetail(err, 'product_inventory_id')
              if (unitConflict) {
                displayClose()
                displayCustom({
                  title: 'Căn đã có hợp đồng cọc khác',
                  size: 'md',
                  hideFooter: true,
                  content: <p className="text-content-dark-2 text-sm">{unitConflict}</p>,
                })
                return
              }

              // Error toast already shown by the mutation hooks (showErrorToast: true).
              // Do NOT toast again here or the message renders twice.
              console.error(err)
            } finally {
              setLoading(false)
            }
          }}
        />
      ),
      hideFooter: true,
    })
  }

  const handlePreviewEmail = async (item: DepositContract) => {
    try {
      setLoading(true)
      const res: any = await previewReclaimedDepositEmail(item.id)
      extractReclaimedEmailWarnings(res).forEach((warning) => toast.warning(warning))
      displayFormContent({
        title: 'Xem trước Email',
        content: (
          <div className="max-h-[60vh] overflow-auto p-4">
            <div
              dangerouslySetInnerHTML={{ __html: res?.html_content || res?.content || String(res) }}
            />
          </div>
        ),
        hideFooter: true,
      })
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSendEmail = (item: DepositContract) => {
    displayConfirm({
      title: 'Gửi Email thu hồi',
      description: 'Bạn có chắc chắn muốn gửi email thu hồi cọc cho khách hàng này không?',
      confirmText: 'Gửi Email',
      cancelText: 'Hủy',
      onConfirm: async () => {
        try {
          setLoading(true)
          const res = await sendReclaimedDepositEmail(item.id)
          toast.success(`Đã gửi email thành công`)
          // Bên nào thiếu email thì bị bỏ qua — báo để người dùng bổ sung vào hồ sơ.
          extractReclaimedEmailWarnings(res).forEach((warning) => toast.warning(warning))
          displayClose()
        } catch (err: any) {
          console.error(err)
          toast.error(extractErrorMessage(err, 'Có lỗi xảy ra khi gửi email'))
          const apiErr: any = new Error('API error')
          apiErr.isApiError = true
          throw apiErr
        } finally {
          setLoading(false)
        }
      },
    })
  }

  const handleDelete = (item: DepositContract) => {
    displayConfirm({
      title: 'Xóa hợp đồng đặt cọc',
      description:
        'Bạn có chắc chắn muốn xóa hợp đồng này không? Hành động này không thể hoàn tác.',
      confirmText: 'Xóa',
      cancelText: 'Hủy',
      onConfirm: async () => {
        try {
          setLoading(true)
          await deleteDepositContract(item.id)
          toast.success('Xóa hợp đồng thành công')
          queryClient.invalidateQueries({ queryKey: ['sales', 'deposit-contracts', 'list'] })
          displayClose()
        } catch (err: any) {
          // base-service.ts already shows toast error
          console.error(err)
          const apiErr: any = new Error('API error')
          apiErr.isApiError = true
          throw apiErr
        } finally {
          setLoading(false)
        }
      },
    })
  }

  const columns: ColumnDef<DepositContract>[] = useMemo(
    () => [
      {
        accessorKey: 'code',
        header: 'Mã hợp đồng',
        size: 180,
        cell: ({ row }) => (
          <ReferenceCode
            code={row.original.code}
            linkTo={APP_PATH.DEPOSIT_CONTRACT_DETAIL.replace(':id', row.original.id.toString())}
          />
        ),
        meta: { width: 'w-[180px]', sortable: true },
      },
      {
        // `contract_number` là SỐ PHIẾU do nghiệp vụ cấp (vd 2026-940102), khác hẳn `code` là mã
        // hệ thống sinh (vd DC-2026-001894). Nhãn lấy đúng tên field này đang dùng ở màn Chi tiết
        // và form Sửa ("Mã phiếu đặt cọc") để một field không mang hai tên trên cùng một feature.
        accessorKey: 'contract_number',
        header: 'Mã phiếu đặt cọc',
        size: 180,
        cell: ({ row }) => row.original.contract_number || '-',
        meta: { width: 'w-[180px]', sortable: true },
      },

      {
        accessorKey: 'customer',
        header: 'Khách hàng',
        size: 200,
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
          const potentialCustomer = row.original.potential_customer_detail
          if (
            potentialCustomer &&
            typeof potentialCustomer === 'object' &&
            'full_name' in potentialCustomer
          ) {
            return (potentialCustomer as any).full_name || '-'
          }
          // Fallback to snapshot fields (e.g. contracts created from Mobile without linked Customer record)
          const snapshotName = row.original.cust_full_name || row.original.cust_business_name || ''
          return snapshotName || '-'
        },
        meta: { width: 'w-[200px]', sortable: true },
      },
      {
        accessorKey: 'project',
        header: 'Dự án',
        size: 280,
        cell: ({ row }) => {
          const detail = row.original.project_detail
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
        meta: { width: 'w-[280px]', sortable: true },
      },
      {
        accessorKey: 'product_inventory',
        header: 'Bất động sản',
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
        meta: { width: 'w-[180px]', sortable: true },
      },
      {
        accessorKey: 'listed_price',
        header: 'Giá niêm yết',
        size: 180,
        cell: ({ row }) =>
          row.original.listed_price
            ? formatCurrencyVND(Number(row.original.listed_price), { maximumFractionDigits: 0 })
            : '-',
        meta: { width: 'w-[180px]', sortable: true },
      },
      {
        accessorKey: 'status',
        header: 'Trạng thái',
        size: 160,
        cell: ({ row }) => {
          const status = row.original.status
          if (!status) return '-'
          const label = statusLabels[status] || status
          const variant = STATUS_VARIANTS[status] || ColoredValueVariant.GREY
          return <Chip label={label} variant={variant} size="small" />
        },
        meta: { width: 'w-[160px]', sortable: true },
      },
      {
        accessorKey: 'approval_status',
        header: 'Trạng thái phê duyệt',
        size: 220,
        cell: ({ row }) => {
          const status = row.original.approval_status
          if (!status) return '-'
          const label = approvalStatusLabels[status] || statusLabels[status] || status
          // Không dùng STATUS_VARIANTS: nó key theo vòng đời nên `pending_admin` và
          // `pending_admin_lead` không khớp mục nào ⇒ xám lẫn giữa các bàn chờ màu cam.
          const variant = getDepositApprovalStatusVariant(status)
          return <Chip label={label} variant={variant} size="small" />
        },
        meta: { width: 'w-[220px]', sortable: true },
      },
      {
        accessorKey: 'contract_date',
        header: 'Ngày hợp đồng',
        size: 150,
        cell: ({ row }) =>
          row.original.contract_date
            ? format(new Date(row.original.contract_date), 'dd/MM/yyyy')
            : '-',
        meta: { width: 'w-[150px]', sortable: true },
      },
    ],
    []
  )

  const actions: TableAction<DepositContract>[] = useMemo(
    () => [
      {
        label: 'Xem chi tiết',
        icon: <IconEye />,
        tooltip: 'Xem chi tiết',
        show: () => ability.can('retrieve', 'deposit_contract'),
        onClick: (row) =>
          navigate(APP_PATH.DEPOSIT_CONTRACT_DETAIL.replace(':id', row.id.toString())),
      },
      {
        label: 'Danh sách giao dịch',
        icon: <List className="h-4 w-4" />,
        tooltip: 'Danh sách giao dịch',
        show: () => ability.can('retrieve', 'deal'),
        onClick: (row) => {
          const code =
            row.product_inventory_detail?.unit_number || row.product_inventory_detail?.code || ''
          navigate(`${APP_PATH.DEAL}?unit_number=${code}`)
        },
      },
      {
        label: 'Xem lịch sử',
        icon: <IconClockcounterclockwise />,
        tooltip: 'Lịch sử',
        show: () => ability.can('histories', 'deposit_contract'),
        onClick: (row) =>
          navigate(APP_PATH.DEPOSIT_CONTRACT_HISTORY.replace(':id', row.id.toString())),
      },
      {
        label: 'Tạo phiếu TTGD',
        icon: <FileText className="h-4 w-4" />,
        tooltip: 'Tạo phiếu thông tin giao dịch từ hợp đồng cọc này',
        show: (row: DepositContract) =>
          ability.can('create', 'transaction_sheet') &&
          row.approval_status === DepositContractApprovalStatus.approved &&
          (row.status as string) !== DepositStatus.ABANDONED &&
          (row.status as string) !== DepositStatus.REFUNDED &&
          (row.status as string) !== DepositStatus.REJECTED,
        onClick: (row) =>
          navigate(`${APP_PATH.TRANSACTION_SHEET_CREATE}?deposit_contract_id=${row.id}`),
      },
      // Admin Lead: Xác nhận / Từ chối — chỉ ở pending_admin_lead. `pending_manager`
      // là bàn của Trưởng phòng KD (quyền `manager_confirm`); BE chặn cứng
      // admin-lead-approve ngoài pending_admin_lead nên nút ở đó luôn trả 400.
      {
        label: 'Xác nhận (Trưởng nhóm Admin)',
        icon: <IconCheck />,
        tooltip: 'Trưởng nhóm Admin xác nhận',
        onClick: (row) => openApprovalModal(row, 'admin-lead-approve'),
        show: (row: DepositContract) =>
          ability.can('admin_lead_approve', 'deposit_contract') &&
          row.approval_status === DepositContractApprovalStatus.pending_admin_lead,
      },
      {
        label: 'Từ chối (Trưởng nhóm Admin)',
        icon: <IconX />,
        tooltip: 'Trưởng nhóm Admin từ chối',
        onClick: (row) => openApprovalModal(row, 'admin-lead-reject'),
        show: (row: DepositContract) =>
          ability.can('admin_lead_approve', 'deposit_contract') &&
          row.approval_status === DepositContractApprovalStatus.pending_admin_lead,
      },
      // Accountant: Phê duyệt / Từ chối (pending_accountant)
      {
        label: 'Kế toán phê duyệt',
        icon: <IconCheck />,
        tooltip: 'Kế toán phê duyệt',
        onClick: (row) => openApprovalModal(row, 'accountant-approve'),
        show: (row: DepositContract) =>
          ability.can('accountant_approve', 'deposit_contract') &&
          row.approval_status === DepositContractApprovalStatus.pending_accountant,
      },
      {
        label: 'Kế toán từ chối',
        icon: <IconX />,
        tooltip: 'Kế toán từ chối',
        onClick: (row) => openApprovalModal(row, 'accountant-reject'),
        show: (row: DepositContract) =>
          ability.can('accountant_approve', 'deposit_contract') &&
          row.approval_status === DepositContractApprovalStatus.pending_accountant,
      },
      // Admin: Phê duyệt / Từ chối (pending_admin)
      {
        label: 'Phê duyệt',
        icon: <IconCheck />,
        tooltip: 'Phê duyệt',
        onClick: (row) => openApprovalModal(row, 'approve'),
        show: (row: DepositContract) =>
          ability.can('approve', 'deposit_contract') &&
          row.approval_status === DepositContractApprovalStatus.pending_admin,
      },
      {
        label: 'Từ chối',
        icon: <IconX />,
        tooltip: 'Từ chối',
        onClick: (row) => openApprovalModal(row, 'reject'),
        show: (row: DepositContract) =>
          ability.can('approve', 'deposit_contract') &&
          row.approval_status === DepositContractApprovalStatus.pending_admin,
      },
      {
        label: 'Xem trước Email thu hồi cọc',
        icon: <IconEye />,
        tooltip: 'Xem trước Email',
        onClick: (row) => handlePreviewEmail(row),
        show: (row: DepositContract) =>
          ability.can('retrieve', 'deposit_contract') &&
          (row.status as string) === DepositStatus.ABANDONED,
      },
      {
        label: 'Gửi Email thu hồi cọc',
        icon: <Mail className="h-4 w-4" />,
        tooltip: 'Gửi Email',
        onClick: (row) => handleSendEmail(row),
        show: (row: DepositContract) =>
          ability.can('update', 'deposit_contract') &&
          (row.status as string) === DepositStatus.ABANDONED,
      },
      {
        label: 'Hủy hợp đồng',
        icon: <Ban className="h-4 w-4" color="red" />,
        tooltip: 'Hủy hợp đồng',
        onClick: (row) => openApprovalModal(row, 'abandon'),
        show: (row: DepositContract) =>
          ability.can('update', 'deposit_contract') &&
          (row.status as string) !== DepositStatus.REJECTED &&
          (row.status as string) !== DepositStatus.ABANDONED,
      },
      {
        label: 'Hoàn tiền',
        icon: <Undo className="h-4 w-4" color="orange" />,
        tooltip: 'Hoàn tiền',
        onClick: (row) => openApprovalModal(row, 'refund'),
        show: (row: DepositContract) =>
          ability.can('update', 'deposit_contract') &&
          row.approval_status === DepositContractApprovalStatus.approved &&
          (row.status as string) !== DepositStatus.REFUNDED,
      },
      {
        label: 'Sửa',
        icon: <IconPencilsimple />,
        tooltip: 'Sửa',
        show: () => ability.can('update', 'deposit_contract'),
        onClick: (row) =>
          navigate(APP_PATH.DEPOSIT_CONTRACT_EDIT.replace(':id', row.id.toString())),
        hidden: (row: DepositContract) =>
          (row.status as string) === DepositStatus.APPROVED ||
          row.approval_status === DepositContractApprovalStatus.pending_accountant,
      },
      {
        label: 'Xóa',
        icon: <IconTrash color="red" />,
        tooltip: 'Xóa',
        onClick: (row) => handleDelete(row),
        show: (row: DepositContract) =>
          ability.can('destroy', 'deposit_contract') &&
          (row.status as string) === DepositStatus.NEW,
      },
    ],
    [
      ability,
      navigate,
      displayFormContent,
      displayClose,
      setLoading,
      queryClient,
      approveDoc,
      adminLeadApprove,
      accountantApprove,
    ]
  )

  if (error) {
    return <TableError />
  }

  return (
    <Table
      className={TABLE_SCOPE_CLASS}
      data={data}
      columns={columns}
      isLoading={isLoading}
      totalRecords={totalRecords}
      pageSize={pageSize}
      currentPageIndex={currentPageIndex}
      onPaginationChange={onPaginationChange}
      showSTT
      enablePagination
      manualPagination
      pageCount={totalRecords > 0 ? Math.ceil(totalRecords / pageSize) : 0}
      enableRowSelection={selectionEnabled ? (row) => !!isRowSelectable?.(row.original) : false}
      getRowId={(row) => String(row.id)}
      rowSelection={selectionEnabled ? rowSelection : undefined}
      onRowSelectionChange={selectionEnabled ? onRowSelectionChange : undefined}
      showActions
      rowActions={actions}
      actionMenuPosition="cursor"
      pageSizeOptions={[25, 50, 100]}
      onClearFilter={onClearFilter}
      hasFilter={hasFilter}
      // Bảng rộng hơn khung: bắt buộc `static` thì `Table` mới dựng `HorizontalScrollBar`,
      // và `disableInnerOverflow` để chỉ còn một thanh cuộn ngang thay vì hai.
      paginationPosition="static"
      disableInnerOverflow={true}
      // Giữ hàng tiêu đề đứng yên khi cuộn dọc. Cần khung trang chặn chiều cao
      // (`h-full` + `overflow-hidden`) mới có tác dụng — xem `DepositContractsPage`.
      stickyHeader
    />
  )
}

export default DepositContractListTable
