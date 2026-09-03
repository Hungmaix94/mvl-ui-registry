import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useDialog } from '@/hooks/useDialog.ts'
import {
  useCreateCompensatoryWorkday,
  useUpdateCompensatoryWorkday,
  type CompensatoryWorkday,
  type CompensatoryWorkdayRequest,
} from '@/features/attendance/services/holiday-service'
import { QUERY_KEYS } from '@/constants/query-keys.ts'
import toastService from '@/services/toast-service.tsx'
import { extractErrorMessage } from '@/utils/error-utils'
import CompensatoryDayFormDialog from '../components/CompensatoryDayFormDialog.tsx'

export const useCompensatoryDayForm = (holidayId: number) => {
  const queryClient = useQueryClient()
  const { displayFormContent, displayClose, setLoading } = useDialog()
  const createMutation = useCreateCompensatoryWorkday()
  const updateMutation = useUpdateCompensatoryWorkday()

  const handleSubmit = useCallback(
    async (data: CompensatoryWorkdayRequest, workdayId?: number) => {
      try {
        setLoading(true)

        if (workdayId) {
          // Edit mode
          await updateMutation.mutateAsync({
            holidayId,
            id: workdayId,
            data,
          })
          toastService.success('Cập nhật ngày làm bù thành công')
        } else {
          // Create mode
          await createMutation.mutateAsync({
            holidayId,
            data,
          })
          toastService.success('Thêm ngày làm bù thành công')
        }

        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.HRM.HOLIDAY_COMPENSATORY_DAYS.LIST(holidayId, {}),
        })

        displayClose()
      } catch (error: unknown) {
        const fallbackMessage = workdayId
          ? 'Có lỗi xảy ra khi cập nhật ngày làm bù'
          : 'Có lỗi xảy ra khi thêm ngày làm bù'
        toastService.error(extractErrorMessage(error, fallbackMessage))
      } finally {
        setLoading(false)
      }
    },
    [holidayId, createMutation, updateMutation, queryClient, displayClose, setLoading]
  )

  const openAddDialog = useCallback(() => {
    displayFormContent({
      title: 'Thêm ngày làm bù',
      content: <CompensatoryDayFormDialog onSubmit={handleSubmit} />,
      hideFooter: true,
    })
  }, [displayFormContent, handleSubmit])

  const openEditDialog = useCallback(
    (workday: CompensatoryWorkday) => {
      displayFormContent({
        title: 'Sửa ngày làm bù',
        content: <CompensatoryDayFormDialog initialData={workday} onSubmit={handleSubmit} />,
        hideFooter: true,
      })
    },
    [displayFormContent, handleSubmit]
  )

  return { openAddDialog, openEditDialog }
}
