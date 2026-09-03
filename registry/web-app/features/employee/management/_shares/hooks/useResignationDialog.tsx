import { useCallback, useRef } from 'react'
import { useDialog } from '@/hooks/useDialog.ts'
import { useToast } from '@/hooks/useToast.ts'
import type { Employee } from '@/features/employee/services/employee-service'
import {
  useResignedEmployee,
  type EmployeeResignedActionRequest,
} from '@/features/employee/services/employee-action-service'
import { formatDateToApi } from '@/utils/date-utils.ts'
import ResignationDialog, {
  type ResignationDialogRef,
  type ResignationFormData,
} from '@/features/employee/management/_shares/components/ResignationDialog.tsx'
import { useInvalidateQueries } from '@/hooks/useApiQuery.ts'
import { handleApiError } from '@/utils/error-utils.ts'

export function useResignationDialog() {
  const { displayCustom, displayClose, setLoading } = useDialog()
  const { success: showSuccessToast, error: showErrorToast } = useToast()
  const resignedEmployeeMutation = useResignedEmployee()
  const invalidateQueries = useInvalidateQueries()
  const formRef = useRef<ResignationDialogRef>(null)

  const openResignationDialog = useCallback(
    (employee: Employee) => {
      const handleSubmit = async (data: ResignationFormData) => {
        try {
          setLoading(true)
          if (!data.resignation_reason) {
            throw new Error('Vui lòng chọn lý do nghỉ việc')
          }
          await resignedEmployeeMutation.mutateAsync({
            id: employee.id,
            data: {
              start_date: formatDateToApi(data.resignation_date),
              resignation_reason:
                data.resignation_reason as EmployeeResignedActionRequest['resignation_reason'],
              description: data.description,
            },
          })
          showSuccessToast('Nghỉ việc thành công')
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
        title: 'Nghỉ việc',
        scrollable: true,
        content: <ResignationDialog ref={formRef} employee={employee} onSubmit={handleSubmit} />,
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
      resignedEmployeeMutation,
      invalidateQueries,
    ]
  )

  return {
    openResignationDialog,
  }
}
