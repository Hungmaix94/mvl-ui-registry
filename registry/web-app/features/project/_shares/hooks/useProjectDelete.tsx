import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { useDialog } from '@/hooks/useDialog.ts'
import { useDeleteProject } from '@/services/realestate-service.ts'
import type { Project } from '@/services/realestate-service.ts'
import toastService from '@/services/toast-service.tsx'
import { QUERY_KEYS } from '@/constants'

export const useProjectDelete = (onSuccess?: () => void) => {
  const { displayConfirm, displayClose, setLoading } = useDialog()
  const queryClient = useQueryClient()
  const deleteMutation = useDeleteProject()

  const openDeleteDialog = useCallback(
    (project: Project) => {
      displayConfirm({
        title: 'Xoá dự án',
        content: (
          <div className="text-content-dark-2">
            Bạn có chắc muốn xoá{' '}
            <b className="typo-body-lg-regular text-content-dark-2">{project.name}</b> không?
            <br />
            Thao tác này không thể hoàn tác.
          </div>
        ),
        onConfirm: async () => {
          try {
            setLoading(true)
            await deleteMutation.mutateAsync(project.id)
            toastService.success('Xoá dự án thành công')
            await queryClient.invalidateQueries({
              queryKey: QUERY_KEYS.REALESTATE.PROJECTS.LIST({}),
            })
            displayClose()
            onSuccess?.()
          } catch {
            // Error toast is handled by service layer
          } finally {
            setLoading(false)
          }
        },
      })
    },
    [displayClose, deleteMutation, displayConfirm, queryClient, onSuccess]
  )

  return {
    openDeleteDialog,
  }
}
