import { useCallback, useRef, type ReactNode } from 'react'
import { useDialog } from '@/hooks/useDialog.ts'
import toastService from '@/services/toast-service.tsx'
import { handleApiError } from '@/utils/error-utils.ts'
import ProposalApproveRejectDialogContent, {
  type ProposalApproveRejectDialogContentRef,
} from '@/features/decision-and-proposal/proposal/_shares/components/ProposalApproveRejectDialogContent.tsx'
import { ProposalApproveRequest, ProposalRejectRequest } from '@/services'
import type { DialogSize } from '@/types/dialog.types.ts'

/** Ref contract a custom approve-dialog content must expose. */
export type ApproveContentRef<TPayload> = {
  getData: () => TPayload | null
}

/** Override config to render a custom approve dialog instead of the default note-only one. */
export type ApproveContentConfig<TPayload> = {
  /** Render the dialog body; call `setRef` with a ref exposing `getData()`. */
  render: (setRef: (ref: ApproveContentRef<TPayload> | null) => void) => ReactNode
  dialogSize?: DialogSize
  scrollable?: boolean
}

type UseProposalApproveRejectOptions<TApprovePayload = ProposalApproveRequest> = {
  onApprove: (id: number, data: TApprovePayload) => Promise<any>
  onReject: (id: number, data: ProposalRejectRequest) => Promise<any>
  approveTitle?: string
  rejectTitle?: string
  approveConfirmText?: string
  rejectConfirmText?: string
  /**
   * Optional custom approve dialog (e.g. overtime-work per-day hour editing).
   * When provided, its `getData()` result is sent straight to `onApprove`.
   * When omitted, the default note-only dialog is shown and `{ approval_note }` is sent.
   */
  approveContent?: ApproveContentConfig<TApprovePayload>
}

export function useProposalApproveReject<TApprovePayload = ProposalApproveRequest>({
  onApprove,
  onReject,
  approveTitle = 'Duyệt đề xuất',
  rejectTitle = 'Từ chối đề xuất',
  approveConfirmText = 'Xác nhận',
  rejectConfirmText = 'Từ chối',
  approveContent,
}: UseProposalApproveRejectOptions<TApprovePayload>) {
  const { displayCustom, setLoading } = useDialog()
  // Holds whichever content ref is active (default note dialog or a custom override).
  const approveContentRef = useRef<{ getData: () => unknown } | null>(null)
  const rejectContentRef = useRef<ProposalApproveRejectDialogContentRef>(null)

  const handleApprove = useCallback(
    (id: number, contentOverride?: ApproveContentConfig<TApprovePayload>) => {
      // Reset ref for new dialog instance
      approveContentRef.current = null

      // Per-call override (e.g. list rows pass the content built from that row's proposal) takes
      // precedence over the static config supplied at hook creation (detail page).
      const activeContent = contentOverride ?? approveContent

      const setApproveRef = (ref: { getData: () => unknown } | null) => {
        approveContentRef.current = ref
      }

      const content = activeContent ? (
        activeContent.render(setApproveRef)
      ) : (
        <ProposalApproveRejectDialogContent ref={setApproveRef} type="approve" />
      )

      displayCustom({
        title: approveTitle,
        content,
        confirmText: approveConfirmText,
        cancelText: 'Huỷ',
        size: activeContent?.dialogSize ?? 'md',
        scrollable: activeContent?.scrollable,
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
            // Custom content already returns the full payload; the default dialog returns
            // only a note which we map onto `approval_note`.
            const payload = (
              activeContent
                ? data
                : { approval_note: (data as { note: string | null }).note || null }
            ) as TApprovePayload
            await onApprove(id, payload)
            toastService.success('Duyệt đề xuất thành công')
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
    [displayCustom, onApprove, approveTitle, approveConfirmText, setLoading, approveContent]
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
            await onReject(id, { approval_note: data.note })
            toastService.success('Từ chối đề xuất thành công')
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
    [displayCustom, onReject, rejectTitle, rejectConfirmText, setLoading]
  )

  return {
    handleApprove,
    handleReject,
  }
}
