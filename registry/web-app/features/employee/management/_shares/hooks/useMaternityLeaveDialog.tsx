import { useCallback, useRef } from 'react'
import { useDialog } from '@/hooks/useDialog.ts'
import { useToast } from '@/hooks/useToast.ts'
import { useMaternityLeaveEmployee } from '@/features/employee/services/employee-action-service'
import { formatDateToApi } from '@/utils/date-utils.ts'
import MaternityLeaveDialog, {
  type MaternityLeaveDialogRef,
  type MaternityLeaveFormData,
} from '@/features/employee/management/_shares/components/MaternityLeaveDialog.tsx'
import type { Employee } from '@/features/employee/services/employee-service'
import { useInvalidateQueries } from '@/hooks/useApiQuery.ts'
import { handleApiError } from '@/utils/error-utils.ts'

export function useMaternityLeaveDialog() {
  const { displayCustom, displayClose, setLoading } = useDialog()
  const { success: showSuccessToast, error: showErrorToast } = useToast()
  const maternityLeaveMutation = useMaternityLeaveEmployee()
  const invalidateQueries = useInvalidateQueries()
  const formRef = useRef<MaternityLeaveDialogRef>(null)

  const openMaternityLeaveDialog = useCallback(
    (employee: Employee) => {
      const handleSubmit = async (data: MaternityLeaveFormData) => {
        try {
          setLoading(true)
          if (!data.date_range || !data.date_range.from) {
            throw new Error('Vui lòng chọn ngày nghỉ thai sản')
          }
          await maternityLeaveMutation.mutateAsync({
            id: employee.id,
            data: {
              start_date: formatDateToApi(data.date_range.from),
              end_date: data.date_range.to
                ? formatDateToApi(data.date_range.to)
                : formatDateToApi(data.date_range.from),
              description: data.description,
            },
          })
          showSuccessToast('Nghỉ thai sản thành công')
          await invalidateQueries.invalidateByPrefix('hrm/employees')
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
        title: 'Nghỉ thai sản',
        scrollable: true,
        content: <MaternityLeaveDialog ref={formRef} employee={employee} onSubmit={handleSubmit} />,
        hideFooter: false,
        confirmText: 'Xác nhận',
        cancelText: 'Huỷ',
        onConfirm: handleConfirm,
        onCancel: displayClose,
        footerFlexJustify: 'end',
        dialogContentClassName: 'p-0',
      })
    },
    [
      displayCustom,
      displayClose,
      setLoading,
      showSuccessToast,
      showErrorToast,
      maternityLeaveMutation,
      invalidateQueries,
    ]
  )

  return {
    openMaternityLeaveDialog,
  }
}
