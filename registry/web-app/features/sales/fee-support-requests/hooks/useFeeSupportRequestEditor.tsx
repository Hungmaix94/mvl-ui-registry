import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { useDialog } from '@/hooks/useDialog'
import toastService from '@/services/toast-service'

import FeeSupportRequestEditDialogForm from '../components/FeeSupportRequestEditDialogForm'
import { type FeeSupportStaffRow } from '../components/FeeSupportSalesStaffField'
import {
  useUpdateFeeSupportRequest,
  type FeeSupportRequest,
} from '../services/fee-support-request-service'

interface UseFeeSupportRequestEditorResult {
  openEditDialog: (record: FeeSupportRequest, salesStaff: readonly FeeSupportStaffRow[]) => void
}

/**
 * Mở dialog SỬA phiếu hỗ trợ phí web_secretary (86eyqf9m3) — creator sửa phiếu của
 * chính mình khi còn DRAFT/PENDING_TP_ADMIN. Mirror `useFeeSupportProposalCreator`
 * (dialog tạo từ màn HĐ cọc): `displayCustom` + `destroyOnClose` + backdrop khoá,
 * lỗi giữ dialog + show trong form thay vì toast.
 */
export function useFeeSupportRequestEditor(): UseFeeSupportRequestEditorResult {
  const { displayCustom, displayClose } = useDialog()
  const queryClient = useQueryClient()
  const updateMutation = useUpdateFeeSupportRequest()

  const openEditDialog = useCallback(
    (record: FeeSupportRequest, salesStaff: readonly FeeSupportStaffRow[]) => {
      displayCustom({
        title: 'Sửa đề xuất hỗ trợ phí',
        size: '2xl',
        hideFooter: true,
        disableBackdropClose: true,
        destroyOnClose: true,
        content: (
          <FeeSupportRequestEditDialogForm
            record={record}
            salesStaff={salesStaff}
            onCancel={displayClose}
            onSubmit={async (payload) => {
              await updateMutation.mutateAsync({ id: record.id, data: payload })
              displayClose()
              toastService.success('Cập nhật đề xuất hỗ trợ phí thành công')
              // Prefix match — cùng 1 lời gọi làm mới cả LIST lẫn DETAIL (query key
              // chung gốc ['sales', 'fee-support-requests', ...]), giống cách màn
              // chi tiết đã làm cho duyệt/từ chối.
              queryClient.invalidateQueries({ queryKey: ['sales', 'fee-support-requests'] })
            }}
          />
        ),
      })
    },
    [displayCustom, displayClose, updateMutation, queryClient]
  )

  return { openEditDialog }
}
