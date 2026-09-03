import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useDialog } from '@/hooks/useDialog.ts'
import {
  useCreateBranchContactInfo,
  useUpdateBranchContactInfo,
  type BranchContactInfo,
  type BranchContactInfoRequest,
} from '@/features/org/services/branch-service'
import { QUERY_KEYS } from '@/constants/query-keys.ts'
import toastService from '@/services/toast-service.tsx'
import BranchContactInfoFormDialog from '@/features/org/branch/_shares/components/BranchContactInfoFormDialog.tsx'

export const useBranchContactInfoAdd = (branchId: number) => {
  const queryClient = useQueryClient()
  const { displayFormContent, displayClose, setLoading } = useDialog()
  const createMutation = useCreateBranchContactInfo()
  const updateMutation = useUpdateBranchContactInfo()

  const handleSubmit = useCallback(
    async (data: BranchContactInfoRequest, contactInfoId?: number) => {
      try {
        setLoading(true)

        if (contactInfoId) {
          // Edit mode
          await updateMutation.mutateAsync({
            id: contactInfoId,
            data,
          })
          toastService.success('Cập nhật thông tin liên hệ thành công')
        } else {
          // Create mode
          await createMutation.mutateAsync(data)
          toastService.success('Thêm thông tin liên hệ thành công')
        }

        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.HRM.BRANCH_CONTACT_INFOS.LIST({ branch: branchId }),
        })

        displayClose()
      } catch (error) {
        toastService.error(
          contactInfoId
            ? 'Có lỗi xảy ra khi cập nhật thông tin liên hệ'
            : 'Có lỗi xảy ra khi thêm thông tin liên hệ'
        )
      } finally {
        setLoading(false)
      }
    },
    [branchId, createMutation, updateMutation, queryClient, displayClose, setLoading]
  )

  const openAddDialog = useCallback(() => {
    displayFormContent({
      title: 'Thêm thông tin liên hệ',
      content: <BranchContactInfoFormDialog branchId={branchId} onSubmit={handleSubmit} />,
      hideFooter: true,
    })
  }, [displayFormContent, handleSubmit, branchId])

  const openEditDialog = useCallback(
    (contactInfo: BranchContactInfo) => {
      displayFormContent({
        title: 'Sửa thông tin liên hệ',
        content: (
          <BranchContactInfoFormDialog
            branchId={branchId}
            initialData={contactInfo}
            onSubmit={handleSubmit}
          />
        ),
        hideFooter: true,
      })
    },
    [displayFormContent, handleSubmit, branchId]
  )

  return { openAddDialog, openEditDialog }
}
