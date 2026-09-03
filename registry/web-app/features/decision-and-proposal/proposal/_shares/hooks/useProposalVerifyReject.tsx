import { useCallback, useRef } from 'react'
import { useDialog } from '@/hooks/useDialog.ts'
import toastService from '@/services/toast-service.tsx'
import { handleApiError } from '@/utils/error-utils.ts'
import ProposalApproveRejectDialogContent, {
  type ProposalApproveRejectDialogContentRef,
} from '@/features/decision-and-proposal/proposal/_shares/components/ProposalApproveRejectDialogContent.tsx'

type UseProposalVerifyRejectOptions = {
  onApprove: (id: number, data: { note?: string | null }) => Promise<any>
  onReject: (id: number, data: { note: string }) => Promise<any>
  approveTitle?: string
  rejectTitle?: string
  approveConfirmText?: string
  rejectConfirmText?: string
  onSuccess?: () => void
}

export const useProposalVerifyReject = ({
  onApprove,
  onReject,
  approveTitle = 'Xác nhận đề xuất',
  rejectTitle = 'Từ chối đề xuất',
  approveConfirmText = 'Xác nhận',
  rejectConfirmText = 'Từ chối',
  onSuccess,
}: UseProposalVerifyRejectOptions) => {
  const { displayCustom, setLoading } = useDialog()
  const approveContentRef = useRef<ProposalApproveRejectDialogContentRef>(null)
  const rejectContentRef = useRef<ProposalApproveRejectDialogContentRef>(null)

  const handleApprove = useCallback(
    (id: number) => {
      // Reset ref for new dialog instance
      approveContentRef.current = null

      const contentRef = (ref: ProposalApproveRejectDialogContentRef | null) => {
        approveContentRef.current = ref
      }

      displayCustom({
        title: approveTitle,
        content: <ProposalApproveRejectDialogContent ref={contentRef} type="approve" />,
        confirmText: approveConfirmText,
        cancelText: 'Huỷ',
        size: 'md',
        footerFlexJustify: 'end',
        onConfirm: async () => {
          const data = approveContentRef.current?.getData()
          if (!data) {
            // Validation failed, don't close dialog
            const error = new Error('Validation failed')
            ;(error as any).isValidationError = true
            throw error
          }

          setLoading(true)
          try {
            await onApprove(id, { note: data.note || null })
            toastService.success('Duyệt đề xuất thành công')
            onSuccess?.()
          } catch (error) {
            handleApiError(error)
            throw error
          } finally {
            setLoading(false)
          }
        },
        onCancel: () => {
          // Dialog will close automatically via onCancel
        },
      })
    },
    [displayCustom, onApprove, approveTitle, approveConfirmText, setLoading, onSuccess]
  )

  const handleReject = useCallback(
    (id: number) => {
      // Reset ref for new dialog instance
      rejectContentRef.current = null

      const contentRef = (ref: ProposalApproveRejectDialogContentRef | null) => {
        rejectContentRef.current = ref
      }

      displayCustom({
        title: rejectTitle,
        content: <ProposalApproveRejectDialogContent ref={contentRef} type="reject" />,
        confirmText: rejectConfirmText,
        cancelText: 'Huỷ',
        size: 'md',
        confirmButtonClassName:
          'bg-action-primary-red-default hover:bg-action-primary-red-hover text-white',
        footerFlexJustify: 'end',
        onConfirm: async () => {
          const data = rejectContentRef.current?.getData()
          if (!data) {
            // Validation failed, don't close dialog
            const error = new Error('Validation failed')
            ;(error as any).isValidationError = true
            throw error
          }

          if (!data.note) {
            // This should not happen due to validation, but just in case
            const error = new Error('Ghi chú là bắt buộc')
            ;(error as any).isValidationError = true
            throw error
          }

          setLoading(true)
          try {
            await onReject(id, { note: data.note })
            toastService.success('Từ chối đề xuất thành công')
            onSuccess?.()
          } catch (error) {
            handleApiError(error)
            throw error
          } finally {
            setLoading(false)
          }
        },
        onCancel: () => {
          // Dialog will close automatically via onCancel
        },
      })
    },
    [displayCustom, onReject, rejectTitle, rejectConfirmText, setLoading, onSuccess]
  )

  return {
    handleVerifyProposal: handleApprove,
    handleRejectProposal: handleReject,
  }
}
