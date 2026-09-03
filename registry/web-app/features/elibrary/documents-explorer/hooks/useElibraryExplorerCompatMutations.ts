import { type components } from '@/api/schema'
import { useApiMutation } from '@/hooks/useApiQuery'
import { getElibraryService } from '@/services/elibrary-service'

export function useElibraryUpdateDocumentCompatMutation() {
  return useApiMutation(
    (variables: {
      projectId: number
      documentId: number
      data: components['schemas']['PatchedLibraryItemUpdateRequest']
    }) => getElibraryService().partialUpdateFile(variables.documentId, variables.data),
    { skipInvalidateOnSuccess: true }
  )
}

export function useElibraryDeleteDocumentCompatMutation() {
  return useApiMutation(
    (variables: { projectId: number; documentId: number }) =>
      getElibraryService().deleteFile(variables.documentId),
    { skipInvalidateOnSuccess: true }
  )
}

export function useElibraryShareDocumentCompatMutation() {
  return useApiMutation(
    (variables: {
      projectId: number
      documentId: number
      data: components['schemas']['LibraryShareCreateRequest']
    }) => getElibraryService().shareFile(variables.documentId, variables.data),
    { showErrorToast: true, skipInvalidateOnSuccess: true }
  )
}

export function useElibraryCreateDocumentsCompatMutation() {
  return useApiMutation(
    (variables: {
      projectId: number
      data:
        | components['schemas']['ProjectDocumentCreateRequest']
        | { files: components['schemas']['ProjectDocumentCreateRequest'][] }
    }) => getElibraryService().createFiles(variables.data as any)
  )
}

export function useElibraryCreateFolderCompatMutation() {
  return useApiMutation(
    (variables: {
      projectId: number
      data: components['schemas']['ProjectDocumentFolderCreateRequest'] & {
        folder_type?: components['schemas']['LibraryItemFolderCreateRequest']['folder_type']
        department?: components['schemas']['LibraryItemFolderCreateRequest']['department']
      }
    }) =>
      getElibraryService().createFolder({
        name: variables.data.name,
        parent: variables.data.parent ?? null,
        ...(variables.data.folder_type ? { folder_type: variables.data.folder_type } : {}),
        ...(variables.data.department != null ? { department: variables.data.department } : {}),
      })
  )
}

export function useElibraryBulkMoveDocumentsCompatMutation() {
  return useApiMutation((variables: { projectId: number; ids: number[]; folder: number | null }) =>
    getElibraryService().bulkUpdateItems({
      ids: variables.ids,
      parent: variables.folder,
    })
  )
}
