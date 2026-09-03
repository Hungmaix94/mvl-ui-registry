import { useCallback, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useDialog } from '@/hooks/useDialog'
import {
  type RealestateLibraryFileRead,
  type RealestatePatchedLibraryItemUpdateRequest,
  usePartialUpdateProjectDocument,
} from '@/services/document-service'
import toastService from '@/services/toast-service'
import ProjectDocumentForm, {
  type ProjectDocumentFormRef,
} from '../components/form/ProjectDocumentForm'

type OpenProjectDocumentEditDialogParams = {
  projectId: number
  item: RealestateLibraryFileRead
  onSuccess?: () => void
}

type ProjectDocumentFileEditDialogOptions = {
  useUpdateMutationHook?: typeof usePartialUpdateProjectDocument
  /** Defaults to realestate project documents prefix when omitted (e.g. elibrary passes adapter key). */
  listInvalidateQueryKey?: (projectId: number) => readonly unknown[]
}

export function useProjectDocumentFileEditDialog(options?: ProjectDocumentFileEditDialogOptions) {
  const queryClient = useQueryClient()
  const { displayCustom, displayClose } = useDialog()
  const useUpdateMutationHook = options?.useUpdateMutationHook ?? usePartialUpdateProjectDocument
  const listInvalidateQueryKey =
    options?.listInvalidateQueryKey ??
    ((pid: number) => ['realestate', 'projects', pid, 'documents'] as const)
  const updateMutation = useUpdateMutationHook()
  const formRef = useRef<ProjectDocumentFormRef | null>(null)

  const openEditDialog = useCallback(
    (params: OpenProjectDocumentEditDialogParams) => {
      const { projectId, item, onSuccess } = params

      const handleSubmit = async (data: RealestatePatchedLibraryItemUpdateRequest) => {
        await updateMutation.mutateAsync({
          projectId,
          documentId: item.id,
          data,
        } as any)
        void queryClient.invalidateQueries({
          queryKey: [...listInvalidateQueryKey(projectId)],
        })
        toastService.success('Cập nhật tài liệu thành công')
        onSuccess?.()
        displayClose()
      }

      const handleConfirm = async () => {
        formRef.current?.submit()
      }

      displayCustom({
        size: '2xl',
        title: 'Chỉnh sửa tài liệu dự án',
        destroyOnClose: true,
        content: (
          <ProjectDocumentForm
            ref={formRef}
            onSubmit={handleSubmit}
            isSubmitting={updateMutation.isPending}
            initialData={item}
          />
        ),
        confirmText: 'Cập nhật',
        cancelText: 'Huỷ',
        onConfirm: handleConfirm,
        onCancel: displayClose,
        footerFlexJustify: 'end',
      })
    },
    [displayCustom, displayClose, listInvalidateQueryKey, queryClient, updateMutation]
  )

  return {
    openEditDialog,
  }
}
