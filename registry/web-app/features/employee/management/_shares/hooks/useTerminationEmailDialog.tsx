import { useCallback } from 'react'
import { useDialog } from '@/hooks/useDialog.ts'
import { useToast } from '@/hooks/useToast.ts'
import { useSendTerminationEmail } from '@/features/employee/services/employee-email-service'
import TerminationEmailDialog from '@/features/employee/management/_shares/components/TerminationEmailDialog.tsx'
import type { Employee } from '@/features/employee/services/employee-service'
import { useInvalidateQueries } from '@/hooks/useApiQuery.ts'
import { handleApiError } from '@/utils/error-utils.ts'

export function useTerminationEmailDialog() {
  const { displayCustom, displayClose, setLoading } = useDialog()
  const { success: showSuccessToast } = useToast()
  const sendMutation = useSendTerminationEmail()
  const invalidateQueries = useInvalidateQueries()

  const openTerminationEmailDialog = useCallback(
    (employee: Employee) => {
      const handleSendEmail = async () => {
        try {
          setLoading(true)
          await sendMutation.mutateAsync({ id: employee.id })
          showSuccessToast('Gửi thư chấm dứt HĐLĐ thành công')
          await invalidateQueries.invalidateByPrefix('hrm/employees')
          displayClose()
        } catch (error) {
          handleApiError(error)
          throw error
        } finally {
          setLoading(false)
        }
      }

      displayCustom({
        size: 'xl',
        title: 'Gửi thư chấm dứt HĐLĐ',
        scrollable: true,
        content: <TerminationEmailDialog employee={employee} />,
        hideFooter: false,
        confirmText: 'Gửi mail',
        cancelText: 'Huỷ',
        onConfirm: handleSendEmail,
        onCancel: displayClose,
        dialogContentClassName: 'p-0',
        footerFlexJustify: 'end',
      })
    },
    [displayCustom, displayClose, setLoading, sendMutation, showSuccessToast, invalidateQueries]
  )

  return {
    openTerminationEmailDialog,
  }
}
