import { useCallback, useState } from 'react'
import { useDialog } from '@/hooks/useDialog'
import { useSendPayrollSlipEmail } from '@/features/payroll/services/payroll-slip-service'
import { extractErrorMessage } from '@/utils/error-utils'
import SendEmailProgressDialog from '../components/SendEmailProgressDialog'

export function useSendPayrollSlipEmailAsync() {
  const { displayCustom, displayClose } = useDialog()
  const [isSending, setIsSending] = useState(false)

  // API hooks
  const sendEmailMutation = useSendPayrollSlipEmail()

  // Handle close
  const handleClose = useCallback(() => {
    setIsSending(false)
    displayClose()
  }, [displayClose])

  // Trigger email sending
  const sendEmail = useCallback(
    async (id: number) => {
      try {
        setIsSending(true)

        // Show initial dialog
        displayCustom({
          title: '',
          size: 'md',
          disableBackdropClose: true,
          hideFooter: true,
          content: (
            <SendEmailProgressDialog
              progress={0}
              status="pending"
              onCancel={handleClose}
              onClose={handleClose}
            />
          ),
        })

        // Call API
        await sendEmailMutation.mutateAsync(id)

        // Success state
        displayCustom({
          title: '',
          size: 'md',
          disableBackdropClose: true,
          hideFooter: true,
          content: (
            <SendEmailProgressDialog
              progress={100}
              status="success"
              onCancel={handleClose}
              onClose={handleClose}
            />
          ),
        })
      } catch (error) {
        const errorMessage = extractErrorMessage(error, 'Gửi mail lương thất bại')

        displayCustom({
          title: '',
          size: 'md',
          disableBackdropClose: true,
          hideFooter: true,
          content: (
            <SendEmailProgressDialog
              progress={0}
              status="failure"
              error={errorMessage}
              onCancel={handleClose}
              onClose={handleClose}
              onRetry={() => {
                displayClose()
                setTimeout(() => sendEmail(id), 300)
              }}
            />
          ),
        })
      } finally {
        setIsSending(false)
      }
    },
    [sendEmailMutation, displayCustom, handleClose, displayClose]
  )

  return {
    sendEmail,
    isSending,
  }
}
