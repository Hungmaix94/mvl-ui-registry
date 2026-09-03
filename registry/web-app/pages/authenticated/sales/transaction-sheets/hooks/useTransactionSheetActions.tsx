import { useQueryClient } from '@tanstack/react-query'
import { useDialog } from '@/hooks/useDialog'
import {
  useApproveTransactionSheet,
  useRejectTransactionSheet,
  useDeleteTransactionSheet,
  useManagerConfirmTransactionSheet,
  useAdminLeadApproveTransactionSheet,
} from '@/features/sales/transaction-sheets/services/transaction-sheet-service'
import {
  TransactionSheet,
  TransactionSheetStatus,
} from '@/features/sales/transaction-sheets/types/transaction-sheet'
import { QUERY_KEYS } from '@/constants'
import toastService from '@/services/toast-service'
import { TextArea } from '@/components/ui'
import { handleApiError } from '@/utils/error-utils'

export const useTransactionSheetActions = (): {
  handleApprove: (record: TransactionSheet, title?: string) => Promise<void>
  handleReject: (record: TransactionSheet, title?: string) => Promise<void>
  handleDelete: (record: TransactionSheet) => Promise<void>
} => {
  const queryClient = useQueryClient()
  const { displayConfirm, displayFormContent, displayClose } = useDialog()
  const { mutateAsync: approveTransactionSheet } = useApproveTransactionSheet()
  const { mutateAsync: rejectTransactionSheet } = useRejectTransactionSheet()
  const { mutateAsync: deleteTransactionSheet } = useDeleteTransactionSheet()

  const { mutateAsync: managerConfirmTransactionSheet } = useManagerConfirmTransactionSheet()
  const { mutateAsync: adminLeadApproveTransactionSheet } = useAdminLeadApproveTransactionSheet()

  const processApprovalAction = async (
    record: TransactionSheet,
    is_approved: boolean,
    note?: string
  ) => {
    try {
      const approvalStatus = record.approval_status as unknown as TransactionSheetStatus

      if (approvalStatus === TransactionSheetStatus.PENDING_MANAGER) {
        await managerConfirmTransactionSheet({ id: record.id, is_approved, note })
      } else if (approvalStatus === TransactionSheetStatus.PENDING_ADMIN_LEAD) {
        await adminLeadApproveTransactionSheet({ id: record.id, is_approved, note })
      } else {
        if (is_approved) {
          await approveTransactionSheet({ id: record.id, note })
        } else {
          await rejectTransactionSheet({ id: record.id, note: note || '' })
        }
      }

      toastService.success(
        is_approved ? 'Đã duyệt phiếu thông tin giao dịch' : 'Đã từ chối phiếu thông tin giao dịch'
      )
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.SALES.TRANSACTION_SHEETS.LIST({})],
      })
      displayClose()
    } catch (error) {
      console.error(error)
      handleApiError(error)
    }
  }

  const handleApprove = async (record: TransactionSheet, title?: string) => {
    let note = ''
    const dialogTitle = title || 'Phê duyệt Phiếu thông tin giao dịch'
    const confirmText = dialogTitle.toLowerCase().includes('xác nhận') ? 'Xác nhận' : 'Phê duyệt'

    displayFormContent({
      title: dialogTitle,
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
      confirmText,
      cancelText: 'Hủy',
      onConfirm: async () => {
        await processApprovalAction(record, true, note)
      },
    })
  }

  const handleReject = async (record: TransactionSheet, title?: string) => {
    let note = ''

    displayFormContent({
      title: title || 'Từ chối Phiếu thông tin giao dịch',
      description: 'Bạn có chắc chắn muốn từ chối phiếu này? Vui lòng nhập lý do.',
      content: (
        <div className="p-4">
          <TextArea
            label="Ghi chú"
            placeholder="Nhập lý do từ chối..."
            onChange={(value) => {
              note = value
            }}
            rows={4}
          />
        </div>
      ),
      confirmText: 'Từ chối',
      cancelText: 'Hủy',
      onConfirm: async () => {
        if (!note.trim()) {
          toastService.error('Vui lòng nhập lý do từ chối')
          return
        }
        await processApprovalAction(record, false, note)
      },
    })
  }

  const handleDelete = async (record: TransactionSheet) => {
    displayConfirm({
      title: 'Xóa Phiếu thông tin giao dịch',
      content: `Bạn có chắc chắn muốn xóa phiếu ${record.code}? Hành động này không thể hoàn tác.`,
      confirmButtonClassName: 'bg-data-red-default hover:bg-data-red-hover',
      onConfirm: async () => {
        try {
          await deleteTransactionSheet(record.id)
          toastService.success('Đã xóa phiếu thông tin giao dịch')
          queryClient.invalidateQueries({
            queryKey: [QUERY_KEYS.SALES.TRANSACTION_SHEETS.LIST({})],
          })
          displayClose()
        } catch (error) {
          console.error(error)
          handleApiError(error)
        }
      },
    })
  }

  return {
    handleApprove,
    handleReject,
    handleDelete,
  }
}
