import { useCallback, useRef } from 'react'
import { useDialog } from '@/hooks/useDialog.ts'
import { useToast } from '@/hooks/useToast.ts'
import { useLinkCandidateToEmployee } from '@/features/employee/services/employee-action-service'
import { formatDateToApi } from '@/utils/date-utils.ts'
import LinkCandidateDialog, {
  type LinkCandidateDialogRef,
  type LinkCandidateFormData,
} from '@/features/employee/management/_shares/components/LinkCandidateDialog.tsx'
import type { Employee } from '@/features/employee/services/employee-service'
import { useInvalidateQueries } from '@/hooks/useApiQuery.ts'
import { handleApiError } from '@/utils/error-utils'

export function useLinkCandidateDialog() {
  const { displayCustom, displayClose, setLoading } = useDialog()
  const { success: showSuccessToast } = useToast()
  const linkCandidateMutation = useLinkCandidateToEmployee()
  const invalidateQueries = useInvalidateQueries()
  const formRef = useRef<LinkCandidateDialogRef>(null)

  const openLinkCandidateDialog = useCallback(
    (employee: Employee) => {
      const handleSubmit = async (data: LinkCandidateFormData, setError: any) => {
        try {
          setLoading(true)
          await linkCandidateMutation.mutateAsync({
            id: employee.id,
            data: {
              candidate_id: data.candidate_id,
              onboarding_date: formatDateToApi(data.onboarding_date),
            },
          })
          showSuccessToast('Liên kết ứng viên thành công')
          await invalidateQueries.invalidateByPrefix('hrm/employees')
          displayClose()
        } catch (error: any) {
          handleApiError(error, setError)
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
            throw error
          }
        }
      }

      displayCustom({
        size: 'md',
        title: 'Liên kết với ứng viên',
        scrollable: true,
        content: <LinkCandidateDialog ref={formRef} employee={employee} onSubmit={handleSubmit} />,
        hideFooter: false,
        confirmText: 'Xác nhận',
        cancelText: 'Huỷ',
        onConfirm: handleConfirm,
        onCancel: displayClose,
        dialogContentClassName: 'p-0',
        footerFlexJustify: 'end',
      })
    },
    [
      displayCustom,
      displayClose,
      setLoading,
      showSuccessToast,
      linkCandidateMutation,
      invalidateQueries,
    ]
  )

  return { openLinkCandidateDialog }
}
