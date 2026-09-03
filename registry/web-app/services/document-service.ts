import { BaseApiService } from '@/api/base-service'
import { ApiPaths, type components, type paths, operations } from '@/api/schema.ts'
import { QUERY_KEYS } from '@/constants'
import { useApiMutation, useApiQuery } from '@/hooks/useApiQuery'
import { ElibraryNodeType } from '@/constants/api-schema-aliases'

export type DocumentCategory = components['schemas']['DocumentCategory']
export type DocumentCategoryRequest = components['schemas']['DocumentCategoryRequest']
export type PatchedDocumentCategoryRequest = components['schemas']['PatchedDocumentCategoryRequest']
export type PaginatedDocumentCategoryList = components['schemas']['PaginatedDocumentCategoryList']

export type DocumentFolder = components['schemas']['DocumentFolder']
export type DocumentFolderRequest = components['schemas']['DocumentFolderRequest']
export type PatchedDocumentFolderRequest = components['schemas']['PatchedDocumentFolderRequest']
export type PaginatedDocumentFolderList = components['schemas']['PaginatedDocumentFolderList']

export type DocumentRead = components['schemas']['DocumentRead']
export type DocumentCreateRequest = components['schemas']['DocumentCreateRequest']
export type DocumentUpdateRequest = components['schemas']['DocumentUpdateRequest']
export type PatchedDocumentUpdateRequest = components['schemas']['PatchedDocumentUpdateRequest']
export type PaginatedDocumentReadList = components['schemas']['PaginatedDocumentReadList']

export type DocumentAccessTokenCreateRequest =
  components['schemas']['DocumentAccessTokenCreateRequest']
export type DocumentAccessTokenRead = components['schemas']['DocumentAccessTokenRead']

export type GetDocumentCategoriesParams =
  paths['/api/files/categories/']['get']['parameters']['query']
export type GetDocumentsParams = paths['/api/files/documents/']['get']['parameters']['query']
export type GetDocumentFoldersParams = paths['/api/files/folders/']['get']['parameters']['query']

type GetProjectDocumentsParams =
  paths['/api/realestate/projects/{project_pk}/documents/']['get']['parameters']['query']
type GetProjectDocumentHistoriesParams =
  paths['/api/realestate/projects/{project_pk}/documents/{id}/histories/']['get']['parameters']['query']

// Realestate project document types (shared with project-documents feature)
export type RealestateLibraryFileRead = components['schemas']['LibraryItemRead']
export type RealestatePaginatedLibraryFileReadList =
  components['schemas']['PaginatedLibraryItemReadList']
export type RealestateLibraryShareRead = components['schemas']['LibraryShareRead']
export type RealestatePaginatedLibraryShareReadList =
  components['schemas']['PaginatedLibraryShareReadList']
export type RealestatePatchedLibraryItemUpdateRequest =
  components['schemas']['PatchedLibraryItemUpdateRequest']

export type ProjectDocumentCreateRequest = components['schemas']['ProjectDocumentCreateRequest']

export type GetProjectDocumentFoldersParams = GetProjectDocumentsParams

export type BrowseProjectDocumentResponseData =
  operations['realestate_projects_documents_browse_retrieve']['responses'][200]['content']['application/json']['data']

export class DocumentService extends BaseApiService {
  async getDocumentCategories(params?: GetDocumentCategoriesParams) {
    return await this.getPaginated(ApiPaths.files_categories_list, params)
  }

  async createDocumentCategory(data: DocumentCategoryRequest) {
    return await this.post(ApiPaths.files_categories_create, data)
  }

  async getDocumentCategory(id: number) {
    return await this.get(ApiPaths.files_categories_retrieve, {
      path: { id },
    })
  }

  async updateDocumentCategory(id: number, data: DocumentCategoryRequest) {
    return await this.put(ApiPaths.files_categories_update, data, {
      path: { id },
    })
  }

  async partialUpdateDocumentCategory(id: number, data: PatchedDocumentCategoryRequest) {
    return await this.patch(ApiPaths.files_categories_partial_update, data, {
      path: { id },
    })
  }

  async deleteDocumentCategory(id: number) {
    return await this.delete(ApiPaths.files_categories_destroy, {
      path: { id },
    })
  }

  async getDocumentFolders(params?: GetDocumentFoldersParams) {
    return await this.getPaginated(ApiPaths.files_folders_list, params)
  }

  async createDocumentFolder(data: DocumentFolderRequest) {
    return await this.post(ApiPaths.files_folders_create, data)
  }

  async getDocumentFolder(id: number) {
    return await this.get(ApiPaths.files_folders_retrieve, {
      path: { id },
    })
  }

  async updateDocumentFolder(id: number, data: DocumentFolderRequest) {
    return await this.put(ApiPaths.files_folders_update, data, {
      path: { id },
    })
  }

  async partialUpdateDocumentFolder(id: number, data: PatchedDocumentFolderRequest) {
    return await this.patch(ApiPaths.files_folders_partial_update, data, {
      path: { id },
    })
  }

  async deleteDocumentFolder(id: number) {
    return await this.delete(ApiPaths.files_folders_destroy, {
      path: { id },
    })
  }

  async getDocuments(params?: GetDocumentsParams) {
    return await this.getPaginated(ApiPaths.files_documents_list, params)
  }

  async createDocument(data: DocumentCreateRequest) {
    return await this.post(ApiPaths.files_documents_create, data)
  }

  async getDocument(id: number) {
    return await this.get(ApiPaths.files_documents_retrieve, {
      path: { id },
    })
  }

  async updateDocument(id: number, data: DocumentUpdateRequest) {
    return await this.put(ApiPaths.files_documents_update, data, {
      path: { id },
    })
  }

  async partialUpdateDocument(id: number, data: PatchedDocumentUpdateRequest) {
    return await this.patch(ApiPaths.files_documents_partial_update, data, {
      path: { id },
    })
  }

  async deleteDocument(id: number) {
    return await this.delete(ApiPaths.files_documents_destroy, {
      path: { id },
    })
  }

  async generateDocumentPublicToken(id: number, body: DocumentAccessTokenCreateRequest) {
    return await this.post(ApiPaths.files_documents_generate_token_create, body, {
      path: { id },
    })
  }

  async getPublicDocumentByToken(token: string) {
    return await this.get(ApiPaths.files_documents_public_retrieve, {
      path: { token },
    })
  }

  // ===== Realestate project documents (files / folders) =====

  async getProjectDocuments(projectId: number, params?: GetProjectDocumentsParams) {
    const query = params ? { ...params } : undefined
    if (query?.search) {
      query.search = query.search.trim()
    }

    return (await this.get(ApiPaths.realestate_projects_documents_list, {
      path: { project_pk: projectId },
      query,
    })) as components['schemas']['PaginatedLibraryItemReadList']
  }

  async createProjectDocuments(
    projectId: number,
    data:
      | components['schemas']['ProjectDocumentCreateRequest']
      | {
          files: components['schemas']['ProjectDocumentCreateRequest'][]
        }
  ) {
    const payload: components['schemas']['ProjectDocumentBulkCreateRequest'] =
      'files' in data
        ? data
        : {
            files: [data],
          }

    return await this.post(
      ApiPaths.realestate_projects_documents_bulk_create_files_create,
      payload,
      {
        path: { project_pk: projectId },
      }
    )
  }

  async getProjectDocument(projectId: number, documentId: number) {
    return await this.get(ApiPaths.realestate_projects_documents_retrieve, {
      path: { project_pk: projectId, id: documentId },
    })
  }

  async updateProjectDocument(
    projectId: number,
    documentId: number,
    data: components['schemas']['PatchedLibraryItemUpdateRequest']
  ) {
    const bulkData: components['schemas']['ProjectDocumentBulkUpdateRequest'] = {
      ids: [documentId],
      name: data.name,
      description: data.description,
      visibility: data.visibility,
    }

    return await this.post(ApiPaths.realestate_projects_documents_bulk_update_create, bulkData, {
      path: { project_pk: projectId },
    })
  }

  async bulkUpdateProjectDocuments(
    projectId: number,
    data: components['schemas']['ProjectDocumentBulkUpdateRequest']
  ) {
    return await this.post(ApiPaths.realestate_projects_documents_bulk_update_create, data, {
      path: { project_pk: projectId },
    })
  }

  async partialUpdateProjectDocument(
    projectId: number,
    documentId: number,
    data: components['schemas']['PatchedLibraryItemUpdateRequest']
  ) {
    return await this.patch(ApiPaths.realestate_projects_documents_partial_update, data, {
      path: { project_pk: projectId, id: documentId },
    })
  }

  async deleteProjectDocument(projectId: number, documentId: number) {
    return await this.delete(ApiPaths.realestate_projects_documents_destroy, {
      path: { project_pk: projectId, id: documentId },
    })
  }

  async shareProjectDocument(
    projectId: number,
    documentId: number,
    data: components['schemas']['LibraryShareCreateRequest']
  ) {
    return await this.post(ApiPaths.realestate_projects_documents_share_create, data, {
      path: { project_pk: projectId, id: documentId },
    })
  }

  async getProjectDocumentShares(
    projectId: number,
    documentId: number,
    params?: paths['/api/realestate/projects/{project_pk}/documents/{id}/shares/']['get']['parameters']['query']
  ) {
    return await this.get(ApiPaths.realestate_projects_documents_shares_list, {
      path: { project_pk: projectId, id: documentId },
      query: params,
    })
  }

  async createProjectDocumentFolder(
    projectId: number,
    data: components['schemas']['ProjectDocumentFolderCreateRequest']
  ) {
    return await this.post(ApiPaths.realestate_projects_documents_create_folder_create, data, {
      path: { project_pk: projectId },
    })
  }

  async getProjectDocumentFolders(projectId: number, params?: GetProjectDocumentsParams) {
    const query: Record<string, unknown> = params ? { ...params } : {}
    query.node_type = ElibraryNodeType.folder

    return (await this.get(ApiPaths.realestate_projects_documents_list, {
      path: { project_pk: projectId },
      query,
    })) as components['schemas']['PaginatedLibraryItemReadList']
  }

  async getProjectDocumentHistories(
    projectId: number,
    documentId: number,
    params?: GetProjectDocumentHistoriesParams
  ) {
    return await this.get(ApiPaths.realestate_projects_documents_histories_retrieve, {
      path: { project_pk: projectId, id: documentId },
      query: params,
    })
  }

  async getProjectDocumentHistory(projectId: number, documentId: number, logId: string) {
    return await this.get(ApiPaths.realestate_projects_documents_history_retrieve, {
      path: { project_pk: projectId, id: documentId, log_id: logId },
    })
  }

  async browseProjectDocument(projectId: number) {
    return await this.get(ApiPaths.realestate_projects_documents_browse_retrieve, {
      path: { project_pk: projectId },
    })
  }
}

let _documentService: DocumentService | null = null

export function getDocumentService(): DocumentService {
  if (!_documentService) {
    _documentService = new DocumentService()
  }
  return _documentService
}

export const documentService = {
  get instance() {
    return getDocumentService()
  },
}

// ===== React Query hooks for project documents (realestate) =====

export function useProjectDocuments(
  projectId: number,
  params?: GetProjectDocumentsParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.REALESTATE.PROJECT_DOCUMENTS.LIST(projectId, params || {}),
    () => getDocumentService().getProjectDocuments(projectId, params),
    {
      staleTime: 1000 * 60 * 5,
      enabled: !!projectId && (options?.enabled ?? true),
    }
  )
}

export function useProjectDocument(projectId: number, documentId: number) {
  return useApiQuery(
    QUERY_KEYS.REALESTATE.PROJECT_DOCUMENTS.DETAIL(projectId, documentId),
    () => getDocumentService().getProjectDocument(projectId, documentId),
    {
      enabled: !!projectId && !!documentId,
      staleTime: 1000 * 60 * 5,
    }
  )
}

export function useProjectDocumentHistories(
  projectId: number,
  documentId: number,
  params?: GetProjectDocumentHistoriesParams
) {
  return useApiQuery(
    QUERY_KEYS.REALESTATE.PROJECT_DOCUMENTS.HISTORIES(projectId, documentId, params || {}),
    () => getDocumentService().getProjectDocumentHistories(projectId, documentId, params),
    {
      enabled: !!projectId && !!documentId,
      staleTime: 1000 * 60 * 5,
    }
  )
}

export function useProjectDocumentHistory(projectId: number, documentId: number, logId: string) {
  return useApiQuery(
    QUERY_KEYS.REALESTATE.PROJECT_DOCUMENTS.HISTORY_DETAIL(projectId, documentId, logId),
    () => getDocumentService().getProjectDocumentHistory(projectId, documentId, logId),
    {
      enabled: !!projectId && !!documentId && !!logId,
      staleTime: 1000 * 60 * 5,
    }
  )
}

export function useBrowseProjectDocument(projectId: number) {
  return useApiQuery(
    QUERY_KEYS.REALESTATE.PROJECT_DOCUMENTS.DETAIL(projectId, 0),
    () => getDocumentService().browseProjectDocument(projectId),
    {
      enabled: !!projectId,
      staleTime: 1000 * 60 * 5,
    }
  )
}

export function useProjectDocumentFolders(
  projectId: number,
  params?: GetProjectDocumentFoldersParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.REALESTATE.PROJECT_DOCUMENTS.FOLDERS(projectId, params || {}),
    () => getDocumentService().getProjectDocumentFolders(projectId, params),
    {
      staleTime: 1000 * 60 * 5,
      enabled: !!projectId && (options?.enabled ?? true),
    }
  )
}

export function useProjectDocumentShares(
  projectId: number,
  documentId: number,
  params?: paths['/api/realestate/projects/{project_pk}/documents/{id}/shares/']['get']['parameters']['query'],
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.REALESTATE.PROJECT_DOCUMENTS.SHARES(projectId, documentId),
    () => getDocumentService().getProjectDocumentShares(projectId, documentId, params),
    {
      enabled: !!projectId && !!documentId && (options?.enabled ?? true),
      staleTime: 1000 * 60 * 5,
    }
  )
}

export function useCreateProjectDocuments() {
  return useApiMutation(
    (variables: {
      projectId: number
      data:
        | components['schemas']['ProjectDocumentCreateRequest']
        | { files: components['schemas']['ProjectDocumentCreateRequest'][] }
    }) => getDocumentService().createProjectDocuments(variables.projectId, variables.data)
  )
}

export function useUpdateProjectDocument() {
  return useApiMutation(
    (variables: {
      projectId: number
      documentId: number
      data: RealestatePatchedLibraryItemUpdateRequest
    }) =>
      getDocumentService().updateProjectDocument(
        variables.projectId,
        variables.documentId,
        variables.data
      )
  )
}

export function useBulkMoveProjectDocuments() {
  return useApiMutation((variables: { projectId: number; ids: number[]; folder: number | null }) =>
    getDocumentService().bulkUpdateProjectDocuments(variables.projectId, {
      ids: variables.ids,
      folder: variables.folder,
    })
  )
}

export function usePartialUpdateProjectDocument() {
  return useApiMutation(
    (variables: {
      projectId: number
      documentId: number
      data: RealestatePatchedLibraryItemUpdateRequest
    }) =>
      getDocumentService().partialUpdateProjectDocument(
        variables.projectId,
        variables.documentId,
        variables.data
      ),
    { skipInvalidateOnSuccess: true }
  )
}

export function useMoveProjectDocument() {
  return useApiMutation(
    (variables: { projectId: number; documentId: number; targetParentId: number | null }) =>
      getDocumentService().partialUpdateProjectDocument(variables.projectId, variables.documentId, {
        parent: variables.targetParentId,
      })
  )
}

export function useDeleteProjectDocument() {
  return useApiMutation(
    (variables: { projectId: number; documentId: number }) =>
      getDocumentService().deleteProjectDocument(variables.projectId, variables.documentId),
    { skipInvalidateOnSuccess: true }
  )
}

export function useShareProjectDocument() {
  return useApiMutation(
    (variables: {
      projectId: number
      documentId: number
      data: components['schemas']['LibraryShareCreateRequest']
    }) =>
      getDocumentService().shareProjectDocument(
        variables.projectId,
        variables.documentId,
        variables.data
      ),
    { showErrorToast: true, skipInvalidateOnSuccess: true }
  )
}

export function useCreateProjectDocumentFolder() {
  return useApiMutation(
    (variables: {
      projectId: number
      data: components['schemas']['ProjectDocumentFolderCreateRequest']
    }) => getDocumentService().createProjectDocumentFolder(variables.projectId, variables.data)
  )
}

export function useDocumentCategories(
  params?: GetDocumentCategoriesParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.FILES.CATEGORIES.LIST(params || {}),
    () => getDocumentService().getDocumentCategories(params),
    {
      staleTime: 1000 * 60 * 5,
      enabled: options?.enabled ?? true,
    }
  )
}

export function useDocumentCategory(id: number) {
  return useApiQuery(
    QUERY_KEYS.FILES.CATEGORIES.DETAIL(id),
    () => getDocumentService().getDocumentCategory(id),
    {
      enabled: !!id,
      staleTime: 1000 * 60 * 5,
    }
  )
}

export function useDocuments(params?: GetDocumentsParams, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.FILES.DOCUMENTS.LIST(params || {}),
    () => getDocumentService().getDocuments(params),
    {
      staleTime: 1000 * 60 * 5,
      enabled: options?.enabled ?? true,
    }
  )
}

export function useDocument(id: number) {
  return useApiQuery(
    QUERY_KEYS.FILES.DOCUMENTS.DETAIL(id),
    () => getDocumentService().getDocument(id),
    {
      enabled: !!id,
      staleTime: 1000 * 60 * 5,
    }
  )
}

export function usePublicDocumentByToken(token: string) {
  return useApiQuery(
    QUERY_KEYS.FILES.DOCUMENTS.PUBLIC(token),
    () => getDocumentService().getPublicDocumentByToken(token),
    {
      enabled: !!token,
      staleTime: 1000 * 60 * 5,
    }
  )
}

export function useDocumentFolders(
  params?: GetDocumentFoldersParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.FILES.FOLDERS.LIST(params || {}),
    () => getDocumentService().getDocumentFolders(params),
    {
      staleTime: 1000 * 60 * 5,
      enabled: options?.enabled ?? true,
    }
  )
}

export function useDocumentFolder(id: number) {
  return useApiQuery(
    QUERY_KEYS.FILES.FOLDERS.DETAIL(id),
    () => getDocumentService().getDocumentFolder(id),
    {
      enabled: !!id,
      staleTime: 1000 * 60 * 5,
    }
  )
}

export function useCreateDocumentCategory() {
  return useApiMutation((data: DocumentCategoryRequest) =>
    getDocumentService().createDocumentCategory(data)
  )
}

export function useUpdateDocumentCategory() {
  return useApiMutation(({ id, data }: { id: number; data: DocumentCategoryRequest }) =>
    getDocumentService().updateDocumentCategory(id, data)
  )
}

export function usePartialUpdateDocumentCategory() {
  return useApiMutation(({ id, data }: { id: number; data: PatchedDocumentCategoryRequest }) =>
    getDocumentService().partialUpdateDocumentCategory(id, data)
  )
}

export function useDeleteDocumentCategory() {
  return useApiMutation((id: number) => getDocumentService().deleteDocumentCategory(id))
}

export function useCreateDocument() {
  return useApiMutation((data: DocumentCreateRequest) => getDocumentService().createDocument(data))
}

export function useUpdateDocument() {
  return useApiMutation(({ id, data }: { id: number; data: DocumentUpdateRequest }) =>
    getDocumentService().updateDocument(id, data)
  )
}

export function usePartialUpdateDocument() {
  return useApiMutation(({ id, data }: { id: number; data: PatchedDocumentUpdateRequest }) =>
    getDocumentService().partialUpdateDocument(id, data)
  )
}

export function useDeleteDocument() {
  return useApiMutation((id: number) => getDocumentService().deleteDocument(id))
}

export function useGenerateDocumentPublicToken() {
  return useApiMutation(({ id, data }: { id: number; data: DocumentAccessTokenCreateRequest }) =>
    getDocumentService().generateDocumentPublicToken(id, data)
  )
}

export function useCreateDocumentFolder() {
  return useApiMutation((data: DocumentFolderRequest) =>
    getDocumentService().createDocumentFolder(data)
  )
}

export function useUpdateDocumentFolder() {
  return useApiMutation(({ id, data }: { id: number; data: DocumentFolderRequest }) =>
    getDocumentService().updateDocumentFolder(id, data)
  )
}

export function usePartialUpdateDocumentFolder() {
  return useApiMutation(({ id, data }: { id: number; data: PatchedDocumentFolderRequest }) =>
    getDocumentService().partialUpdateDocumentFolder(id, data)
  )
}

export function useDeleteDocumentFolder() {
  return useApiMutation((id: number) => getDocumentService().deleteDocumentFolder(id))
}
