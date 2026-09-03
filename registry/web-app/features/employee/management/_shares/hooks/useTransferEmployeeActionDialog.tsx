import { useCallback, useRef } from 'react'
import { useDialog } from '@/hooks/useDialog.ts'
import { useToast } from '@/hooks/useToast.ts'
import type { Employee } from '@/features/employee/services/employee-service'
import { useTransferEmployee } from '@/features/employee/services/employee-action-service'
import { formatDateToApi } from '@/utils/date-utils.ts'
import TransferEmployeeActionDialog, {
  type TransferEmployeeActionDialogRef,
  type TransferEmployeeFormData,
} from '@/features/employee/management/_shares/components/TransferEmployeeActionDialog.tsx'
import { useInvalidateQueries } from '@/hooks/useApiQuery.ts'
import { handleApiError } from '@/utils/error-utils.ts'

export function useTransferEmployeeActionDialog() {
  const { displayCustom, displayClose, setLoading } = useDialog()
  const { success: showSuccessToast } = useToast()
  const transferEmployeeMutation = useTransferEmployee()
  const invalidateQueries = useInvalidateQueries()
  const formRef = useRef<TransferEmployeeActionDialogRef>(null)

  const openTransferEmployeeDialog = useCallback(
    (employee: Employee) => {
      const handleSubmit = async (data: TransferEmployeeFormData) => {
        try {
          setLoading(true)
          await transferEmployeeMutation.mutateAsync({
            id: employee.id,
            data: {
              date: formatDateToApi(data.date),
              department_id: data.department_id,
              position_id: data.position_id,
              note: data.note?.trim() || undefined,
            },
          })
          showSuccessToast('Điều chuyển công tác thành công')
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
          await formRef.current.submit()
        }
      }

      displayCustom({
        size: 'md',
        title: 'Điều chuyển công tác',
        scrollable: true,
        content: (
          <TransferEmployeeActionDialog ref={formRef} employee={employee} onSubmit={handleSubmit} />
        ),
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
      transferEmployeeMutation,
      invalidateQueries,
    ]
  )

  return { openTransferEmployeeDialog }
}
