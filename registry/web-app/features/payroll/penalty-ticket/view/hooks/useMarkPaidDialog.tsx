import { useCallback, useRef } from 'react'
import { useDialog } from '@/hooks/useDialog.ts'
import { useToast } from '@/hooks/useToast.ts'
import {
  type PenaltyTicket,
  usePartialUpdatePenaltyTicket,
} from '@/features/payroll/services/penalty-ticket-service'
import { PenaltyTicketStatus } from '@/constants/api-schema-aliases.ts'
import { format, parse } from 'date-fns'
import { DATE_FORMAT, DATE_SERVER_FORMAT } from '@/constants/date-format'
import { handleApiError } from '@/utils/error-utils'
import MarkPaidDialogForm, {
  type MarkPaidDialogRef,
  type MarkPaidFormData,
} from '../components/MarkPaidDialogForm'

export function useMarkPaidDialog() {
  const { displayCustom, displayClose, setLoading } = useDialog()
  const { success: showSuccessToast } = useToast()
  const mutation = usePartialUpdatePenaltyTicket()
  const formRef = useRef<MarkPaidDialogRef>(null)

  const openMarkPaidDialog = useCallback(
    (ticket: PenaltyTicket, onSuccess?: () => void) => {
      const handleSubmit = async (data: MarkPaidFormData) => {
        try {
          setLoading(true)
          const parsedDate = parse(data.payment_date, DATE_FORMAT, new Date())
          const serverDate = format(parsedDate, DATE_SERVER_FORMAT)

          await mutation.mutateAsync({
            id: ticket.id,
            data: {
              status: PenaltyTicketStatus.PAID,
              payment_date: serverDate,
            } as any,
          })

          showSuccessToast('Đã đánh dấu đã nộp phạt.')
          onSuccess?.()
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
        size: 'md',
        title: 'Đánh dấu đã nộp phạt',
        scrollable: true,
        content: <MarkPaidDialogForm ref={formRef} ticket={ticket} onSubmit={handleSubmit} />,
        hideFooter: false,
        confirmText: 'Đổi tình trạng',
        cancelText: 'Huỷ',
        onConfirm: handleConfirm,
        onCancel: displayClose,
        dialogContentClassName: 'p-0',
        footerFlexJustify: 'end',
      })
    },
    [displayCustom, displayClose, setLoading, showSuccessToast, mutation]
  )

  return {
    openMarkPaidDialog,
  }
}
