import { useCallback, useRef } from 'react'
import { useDialog } from '@/hooks/useDialog.ts'
import { useToast } from '@/hooks/useToast.ts'
import { type PenaltyTicket } from '@/features/payroll/services/penalty-ticket-service'
import { PenaltyTicketStatus } from '@/constants/api-schema-aliases.ts'
import { format, parse } from 'date-fns'
import { DATE_FORMAT, DATE_SERVER_FORMAT } from '@/constants/date-format'
import { handleApiError } from '@/utils/error-utils'
import BulkSubmissionDialogForm, {
  type BulkSubmissionDialogRef,
  type BulkSubmissionFormData,
} from '../components/BulkSubmissionDialogForm'

export function useBulkSubmissionDialog() {
  const { displayCustom, displayClose, setLoading } = useDialog()
  const { success: showSuccessToast } = useToast()
  const formRef = useRef<BulkSubmissionDialogRef>(null)

  const openBulkSubmissionDialog = useCallback(
    (
      selectedTickets: PenaltyTicket[],
      bulkUpdate: any,
      onConfirm?: (submissionDate: string) => void
    ) => {
      const handleSubmit = async (data: BulkSubmissionFormData) => {
        try {
          setLoading(true)
          const parsedDate = parse(data.payment_date, DATE_FORMAT, new Date())
          const serverDate = format(parsedDate, DATE_SERVER_FORMAT)

          await bulkUpdate.mutateAsync({
            ids: selectedTickets.map((r) => r.id),
            status: PenaltyTicketStatus.PAID,
            payment_date: serverDate,
          } as any)

          showSuccessToast('Đã cập nhật trạng thái đã nộp phạt thành công.')
          onConfirm?.(serverDate)
          displayClose()
        } catch (error: any) {
          handleApiError(error)
          throw error
        } finally {
          setLoading(false)
        }
      }

      const handleConfirm = async () => {
        if (formRef.current) {
          try {
            await formRef.current.submit()
          } catch (error) {
            // Re-throw to let GlobalDialog handle it
            throw error
          }
        }
      }

      displayCustom({
        size: 'full',
        title: 'Xác nhận nộp phạt',
        scrollable: true,
        content: (
          <BulkSubmissionDialogForm
            ref={formRef}
            selectedTickets={selectedTickets}
            onSubmit={handleSubmit}
          />
        ),
        hideFooter: false,
        confirmText: 'Xác nhận',
        cancelText: 'Huỷ',
        onConfirm: handleConfirm,
        onCancel: displayClose,
        dialogContentClassName: 'p-0 max-h-[90vh] w-[90vw] max-w-6xl',
        footerFlexJustify: 'end',
      })
    },
    [displayCustom, displayClose, setLoading, showSuccessToast]
  )

  return {
    openBulkSubmissionDialog,
  }
}
