import { useCallback, useRef } from 'react'
import { useDialog } from '@/hooks/useDialog'
import { useCreateProjectDocumentFolder } from '@/services/document-service'
import toastService from '@/services/toast-service'
import { extractErrorMessage } from '@/utils/error-utils'
import ProjectDocumentCreateFolderForm, {
  type ProjectDocumentCreateFolderFormRef,
} from '../components/form/ProjectDocumentCreateFolderForm'
import { ElibraryFolderType } from '@/constants/api-schema-aliases'
const VALIDATION_ERROR = Object.assign(new Error('project_documents_create_folder_validation'), {
  isValidationError: true,
})

type ProjectDocumentFolderCreateDialogOptions = {
  useCreateFolderMutationHook?: typeof useCreateProjectDocumentFolder
  /** Optional: for E-Library, set `folder_type` based on whether we create at root or under a folder. */
  createDialogFolderTypeConfig?: {
    rootFolderType: ElibraryFolderType
    subfolderFolderType?: ElibraryFolderType
    rootDepartmentId?: number
  }
}

export function useProjectDocumentFolderCreateDialog(
  options?: ProjectDocumentFolderCreateDialogOptions
) {
  const { displayCustom, displayClose, setLoading, updateConfig } = useDialog()
  const useCreateFolderMutationHook =
    options?.useCreateFolderMutationHook ?? useCreateProjectDocumentFolder
  const folderTypeConfig = options?.createDialogFolderTypeConfig
  const createFolderMutation = useCreateFolderMutationHook()
  const formRef = useRef<ProjectDocumentCreateFolderFormRef>(null)
  const isSubmittingRef = useRef(false)

  const openCreateFolderDialog = useCallback(
    (projectId: number, currentParentId: number | null, onSuccess?: () => void) => {
      const handleConfirm = async () => {
        if (isSubmittingRef.current) return
        const data = await formRef.current?.submit()
        if (!data) {
          throw VALIDATION_ERROR
        }
        isSubmittingRef.current = true
        try {
          setLoading(true)

          const isRootFolder = currentParentId == null
          const folder_type = folderTypeConfig
            ? isRootFolder
              ? folderTypeConfig.rootFolderType
              : (folderTypeConfig.subfolderFolderType ?? ElibraryFolderType.subfolder)
            : undefined

          await createFolderMutation.mutateAsync({
            projectId,
            data: {
              name: data.name.trim(),
              parent: currentParentId,
              ...(folder_type ? { folder_type } : {}),
              ...(folder_type === ElibraryFolderType.department &&
              isRootFolder &&
              folderTypeConfig?.rootDepartmentId
                ? { department: folderTypeConfig.rootDepartmentId }
                : {}),
            } as any,
          } as any)
          toastService.success('Tạo thư mục thành công')
          onSuccess?.()
          displayClose()
        } catch (error) {
          const message = extractErrorMessage(error, 'Không thể tạo thư mục')
          formRef.current?.setApiError(message)
          const apiError = Object.assign(new Error('project_documents_create_folder_failed'), {
            isApiError: true,
          })
          throw apiError
        } finally {
          setLoading(false)
          isSubmittingRef.current = false
        }
      }

      displayCustom({
        size: 'md',
        title: 'Tạo thư mục',
        destroyOnClose: true,
        disableConfirm: true,
        content: (
          <ProjectDocumentCreateFolderForm
            ref={formRef}
            onEnter={handleConfirm}
            onValidityChange={(valid) => updateConfig({ disableConfirm: !valid })}
          />
        ),
        confirmText: 'Tạo thư mục',
        cancelText: 'Huỷ',
        onConfirm: handleConfirm,
        onCancel: displayClose,
        footerFlexJustify: 'end',
      })
    },
    [displayCustom, displayClose, setLoading, updateConfig, createFolderMutation]
  )

  return {
    openCreateFolderDialog,
  }
}
