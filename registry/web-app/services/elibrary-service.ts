import { BaseApiService } from '@/api/base-service'
import { ApiPaths, components, paths } from '@/api/schema.ts'
import { QUERY_KEYS } from '@/constants'
import { useApiMutation, useApiQuery } from '@/hooks/useApiQuery'
import type { UseMutationOptions } from '@tanstack/react-query'
import type { HistoriesParams } from '@/types/hrm-types'

export type LibraryCategoryCreateRequest = components['schemas']['LibraryCategoryCreateRequest']
export type PatchedLibraryCategoryCreateRequest =
  components['schemas']['PatchedLibraryCategoryCreateRequest']
export type LibraryCategoryRead = components['schemas']['LibraryCategoryRead']
export type LibraryCategoryDropdown = components['schemas']['LibraryCategoryDropdown']
export type PaginatedLibraryCategoryReadList =
  components['schemas']['PaginatedLibraryCategoryReadList']

// Elibrary items now use unified LibraryItem* schemas instead of separate LibraryFile/LibraryFolder
export type LibraryFileCreateRequest = components['schemas']['LibraryItemFileCreateRequest']
export type PatchedLibraryFileUpdateRequest =
  components['schemas']['PatchedLibraryItemUpdateRequest']
export type LibraryFileRead = components['schemas']['LibraryItemRead']
export type PaginatedLibraryFileReadList = components['schemas']['PaginatedLibraryItemReadList']

export type LibraryFolderCreateRequest = components['schemas']['LibraryItemFolderCreateRequest']
export type PatchedLibraryFolderUpdateRequest =
  components['schemas']['PatchedLibraryItemUpdateRequest']
export type LibraryFolder = components['schemas']['LibraryItemRead']
export type PaginatedLibraryFolderList = components['schemas']['PaginatedLibraryItemReadList']

export type LibraryShareCreateRequest = components['schemas']['LibraryShareCreateRequest']
export type LibraryShareRead = components['schemas']['LibraryShareRead']
export type PaginatedLibraryShareReadList = components['schemas']['PaginatedLibraryShareReadList']

export type ElibraryBulkUpdateRequest = components['schemas']['BulkUpdateRequest']
export type LibraryItemReadRequest = components['schemas']['LibraryItemReadRequest']

export type LibraryAccessRequestRead = components['schemas']['LibraryAccessRequestRead']
export type PaginatedLibraryAccessRequestReadList =
  components['schemas']['PaginatedLibraryAccessRequestReadList']
export type LibraryAccessRequestCreateRequest =
  components['schemas']['LibraryAccessRequestCreateRequest']
export type PatchedLibraryAccessRequestUpdateRequest =
  components['schemas']['PatchedLibraryAccessRequestUpdateRequest']

export type GetElibraryAccessRequestsSummaryParams =
  paths['/api/elibrary/access-requests/']['get']['parameters']['query']
export type GetElibraryItemAccessRequestsParams =
  paths['/api/elibrary/items/{id}/access-requests/']['get']['parameters']['query']
type ToggleElibraryFavoriteResponse = Awaited<ReturnType<ElibraryService['toggleFavorite']>>

export type GetElibraryCategoriesParams =
  paths['/api/elibrary/categories/']['get']['parameters']['query']
export type GetElibraryFilesParams = paths['/api/elibrary/items/']['get']['parameters']['query']
export type GetElibraryDepartmentDocumentsParams =
  paths['/api/elibrary/items/department-documents/']['get']['parameters']['query']
export type GetElibraryMyDocumentsParams =
  paths['/api/elibrary/items/my-documents/']['get']['parameters']['query']
export type GetElibrarySharedWithMeParams =
  paths['/api/elibrary/items/shared-with-me/']['get']['parameters']['query']
export type GetElibraryFoldersParams = paths['/api/elibrary/items/']['get']['parameters']['query']
export type GetElibraryFileSharesParams =
  paths['/api/elibrary/items/{id}/shares/']['get']['parameters']['query']
export type GetElibrarySharesParams = paths['/api/elibrary/shares/']['get']['parameters']['query']

export class ElibraryService extends BaseApiService {
  async getCategories(params?: GetElibraryCategoriesParams) {
    return await this.getPaginated(ApiPaths.elibrary_categories_list, params)
  }

  async createCategory(data: LibraryCategoryCreateRequest) {
    return await this.post(ApiPaths.elibrary_categories_create, data)
  }

  async getCategory(id: number) {
    return await this.get(ApiPaths.elibrary_categories_retrieve, {
      path: { id },
    })
  }

  async updateCategory(id: number, data: LibraryCategoryCreateRequest) {
    return await this.put(ApiPaths.elibrary_categories_update, data, {
      path: { id },
    })
  }

  async partialUpdateCategory(id: number, data: PatchedLibraryCategoryCreateRequest) {
    return await this.patch(ApiPaths.elibrary_categories_partial_update, data, {
      path: { id },
    })
  }

  async deleteCategory(id: number) {
    return await this.delete(ApiPaths.elibrary_categories_destroy, {
      path: { id },
    })
  }

  async getCategoriesDropdown() {
    return await this.get(ApiPaths.elibrary_categories_dropdown_retrieve)
  }

  async getFiles(params?: GetElibraryFilesParams) {
    return await this.getPaginated(ApiPaths.elibrary_items_list, params)
  }

  async createFiles(data: LibraryFileCreateRequest | { files: LibraryFileCreateRequest[] }) {
    const payload =
      'files' in data
        ? data
        : {
            files: [data],
          }

    return await this.post(ApiPaths.elibrary_items_bulk_create_files_create, payload as any)
  }

  async getFile(id: number) {
    return await this.get(ApiPaths.elibrary_items_retrieve, {
      path: { id },
    })
  }

  async createItem(data: LibraryItemReadRequest) {
    return await this.post(ApiPaths.elibrary_items_create, data)
  }

  async partialUpdateFile(id: number, data: PatchedLibraryFileUpdateRequest) {
    return await this.patch(ApiPaths.elibrary_items_partial_update, data, {
      path: { id },
    })
  }

  async deleteFile(id: number) {
    return await this.delete(ApiPaths.elibrary_items_destroy, {
      path: { id },
    })
  }

  async getDepartmentDocuments(params?: GetElibraryDepartmentDocumentsParams) {
    return await this.getPaginated(ApiPaths.elibrary_items_department_documents_list, params)
  }

  async getMyDocuments(params?: GetElibraryMyDocumentsParams) {
    return await this.getPaginated(ApiPaths.elibrary_items_my_documents_list, params)
  }

  async getSharedWithMe(params?: GetElibrarySharedWithMeParams) {
    return await this.getPaginated(ApiPaths.elibrary_items_shared_with_me_list, params)
  }

  async shareFile(id: number, data: LibraryShareCreateRequest) {
    return await this.post(ApiPaths.elibrary_items_share_create, data, {
      path: { id },
    })
  }

  async bulkShareFiles(data: components['schemas']['BulkShareCreateRequest']) {
    return await this.post(ApiPaths.elibrary_items_bulk_share_create, data)
  }

  async getFileShares(id: number, params?: GetElibraryFileSharesParams) {
    return await this.getPaginated(ApiPaths.elibrary_items_shares_list, params, {
      id,
    })
  }

  async getFolders(params?: GetElibraryFoldersParams) {
    return await this.getPaginated(ApiPaths.elibrary_items_list, params)
  }

  async createFolder(data: LibraryFolderCreateRequest) {
    return await this.post(ApiPaths.elibrary_items_create_folder_create, data)
  }

  async getFolder(id: number) {
    return await this.get(ApiPaths.elibrary_items_retrieve, {
      path: { id },
    })
  }

  async partialUpdateFolder(id: number, data: PatchedLibraryFolderUpdateRequest) {
    return await this.patch(ApiPaths.elibrary_items_partial_update, data, {
      path: { id },
    })
  }

  async deleteFolder(id: number) {
    return await this.delete(ApiPaths.elibrary_items_destroy, {
      path: { id },
    })
  }

  async toggleFavorite(id: number) {
    return await this.post(ApiPaths.elibrary_items_toggle_favorite_create, undefined, {
      path: { id },
    })
  }

  async bulkUpdateItems(data: ElibraryBulkUpdateRequest) {
    return await this.post(ApiPaths.elibrary_items_bulk_update_create, data)
  }

  async getShares(params?: GetElibrarySharesParams) {
    return await this.getPaginated(ApiPaths.elibrary_shares_list, params)
  }

  async getShare(id: number) {
    return await this.get(ApiPaths.elibrary_shares_retrieve, {
      path: { id },
    })
  }

  async deleteShare(id: number) {
    return await this.delete(ApiPaths.elibrary_shares_destroy, {
      path: { id },
    })
  }

  async getItemHistories(id: number, params?: HistoriesParams) {
    return await this.get(ApiPaths.elibrary_items_histories_retrieve, {
      path: { id: String(id) },
      query: params,
    })
  }

  async getItemHistory(id: number, logId: string) {
    return await this.get(ApiPaths.elibrary_items_history_retrieve, {
      path: { id: String(id), log_id: logId },
    })
  }

  async getItemsTrash() {
    return await this.get(ApiPaths.elibrary_items_trash_retrieve)
  }

  async restoreItem(id: number) {
    return await this.post(ApiPaths.elibrary_items_restore_create, undefined as never, {
      path: { id },
    })
  }

  async purgeItem(id: number) {
    return await this.delete(ApiPaths.elibrary_items_purge_destroy, {
      path: { id },
    })
  }

  async createShareLink(
    id: number,
    data: components['schemas']['LibraryAccessTokenCreateRequest']
  ): Promise<components['schemas']['LibraryAccessTokenRead']> {
    // Schema declares both 200 (paginated list) & 201 (single record); BE thực tế trả 201
    // → cast về single LibraryAccessTokenRead để consumer dùng `url` trực tiếp.
    const response = await this.post(ApiPaths.elibrary_items_share_links_create, data, {
      path: { id },
    })
    return response as unknown as components['schemas']['LibraryAccessTokenRead']
  }

  async getShareLinks(id: number) {
    return await this.get(ApiPaths.elibrary_items_share_links_list, {
      path: { id },
    })
  }

  async deleteShareLink(id: number) {
    return await this.delete(ApiPaths.elibrary_share_links_destroy, {
      path: { id },
    })
  }

  async getPublicLibrary(token: string) {
    return await this.get(ApiPaths.elibrary_public_library_retrieve, {
      path: { token },
    })
  }

  async requestAccess(id: number, message?: string) {
    return await this.post(
      ApiPaths.elibrary_items_request_access_create,
      { message } as LibraryAccessRequestCreateRequest,
      { path: { id } }
    )
  }

  async getAccessRequests(id: number, params?: GetElibraryItemAccessRequestsParams) {
    return await this.getPaginated(ApiPaths.elibrary_items_access_requests_list, params, { id })
  }

  async getAccessRequestsSummary(params?: GetElibraryAccessRequestsSummaryParams) {
    return await this.getPaginated(ApiPaths.elibrary_access_requests_list, params)
  }

  async updateAccessRequest(id: number, status: 'approved' | 'rejected') {
    return await this.patch(
      ApiPaths.elibrary_access_requests_partial_update,
      { status } as PatchedLibraryAccessRequestUpdateRequest,
      { path: { id } }
    )
  }

  async cancelAccessRequest(id: number) {
    return await this.delete(ApiPaths.elibrary_access_requests_destroy, { path: { id } })
  }
}

let _elibraryService: ElibraryService | null = null

export function getElibraryService(): ElibraryService {
  if (!_elibraryService) {
    _elibraryService = new ElibraryService()
  }
  return _elibraryService
}

export const elibraryService = {
  get instance() {
    return getElibraryService()
  },
}

export function useElibraryCategories(
  params?: GetElibraryCategoriesParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.ELIBRARY.CATEGORIES.LIST(params || {}),
    () => getElibraryService().getCategories(params),
    {
      staleTime: 1000 * 60 * 5,
      enabled: options?.enabled ?? true,
    }
  )
}

export function useElibraryCategory(id: number) {
  return useApiQuery(
    QUERY_KEYS.ELIBRARY.CATEGORIES.DETAIL(id),
    () => getElibraryService().getCategory(id),
    {
      enabled: !!id,
      staleTime: 1000 * 60 * 5,
    }
  )
}

export function useElibraryCategoriesDropdown() {
  return useApiQuery(
    QUERY_KEYS.ELIBRARY.CATEGORIES.DROPDOWN(),
    () => getElibraryService().getCategoriesDropdown(),
    {
      staleTime: 1000 * 60 * 5,
    }
  )
}

export function useElibraryFiles(params?: GetElibraryFilesParams, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.ELIBRARY.FILES.LIST(params || {}),
    () => getElibraryService().getFiles(params),
    {
      staleTime: 1000 * 60 * 5,
      enabled: options?.enabled ?? true,
    }
  )
}

export function useElibraryFile(id: number) {
  return useApiQuery(QUERY_KEYS.ELIBRARY.FILES.DETAIL(id), () => getElibraryService().getFile(id), {
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  })
}

export function useElibraryDepartmentDocuments(
  params?: GetElibraryDepartmentDocumentsParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.ELIBRARY.FILES.DEPARTMENT_DOCUMENTS(params || {}),
    () => getElibraryService().getDepartmentDocuments(params),
    {
      staleTime: 1000 * 60 * 5,
      enabled: options?.enabled ?? true,
    }
  )
}

export function useElibraryMyDocuments(
  params?: GetElibraryMyDocumentsParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.ELIBRARY.FILES.MY_DOCUMENTS(params || {}),
    () => getElibraryService().getMyDocuments(params),
    {
      staleTime: 1000 * 60 * 5,
      enabled: options?.enabled ?? true,
    }
  )
}

export function useElibrarySharedWithMe(
  params?: GetElibrarySharedWithMeParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.ELIBRARY.FILES.SHARED_WITH_ME(params || {}),
    () => getElibraryService().getSharedWithMe(params),
    {
      staleTime: 1000 * 60 * 5,
      enabled: options?.enabled ?? true,
    }
  )
}

export function useElibraryFileShares(
  id: number,
  params?: GetElibraryFileSharesParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.ELIBRARY.FILES.SHARES(id, params || {}),
    () => getElibraryService().getFileShares(id, params),
    {
      staleTime: 1000 * 60 * 5,
      enabled: !!id && (options?.enabled ?? true),
    }
  )
}

export function useElibraryFolders(
  params?: GetElibraryFoldersParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.ELIBRARY.FOLDERS.LIST(params || {}),
    () => getElibraryService().getFolders(params),
    {
      staleTime: 1000 * 60 * 5,
      enabled: options?.enabled ?? true,
    }
  )
}

export function useElibraryFolder(id: number) {
  return useApiQuery(
    QUERY_KEYS.ELIBRARY.FOLDERS.DETAIL(id),
    () => getElibraryService().getFolder(id),
    {
      enabled: !!id,
      staleTime: 1000 * 60 * 5,
    }
  )
}

export function useElibraryShares(
  params?: GetElibrarySharesParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.ELIBRARY.SHARES.LIST(params || {}),
    () => getElibraryService().getShares(params),
    {
      staleTime: 1000 * 60 * 5,
      enabled: options?.enabled ?? true,
    }
  )
}

export function useElibraryShare(id: number) {
  return useApiQuery(
    QUERY_KEYS.ELIBRARY.SHARES.DETAIL(id),
    () => getElibraryService().getShare(id),
    {
      enabled: !!id,
      staleTime: 1000 * 60 * 5,
    }
  )
}

export function useCreateElibraryCategory() {
  return useApiMutation((data: LibraryCategoryCreateRequest) =>
    getElibraryService().createCategory(data)
  )
}

export function useUpdateElibraryCategory() {
  return useApiMutation((variables: { id: number; data: LibraryCategoryCreateRequest }) =>
    getElibraryService().updateCategory(variables.id, variables.data)
  )
}

export function usePartialUpdateElibraryCategory() {
  return useApiMutation((variables: { id: number; data: PatchedLibraryCategoryCreateRequest }) =>
    getElibraryService().partialUpdateCategory(variables.id, variables.data)
  )
}

export function useDeleteElibraryCategory() {
  return useApiMutation((id: number) => getElibraryService().deleteCategory(id))
}

export function useCreateElibraryFiles() {
  return useApiMutation((data: LibraryFileCreateRequest | { files: LibraryFileCreateRequest[] }) =>
    getElibraryService().createFiles(data)
  )
}

export function useCreateElibraryItem() {
  return useApiMutation((data: LibraryItemReadRequest) => getElibraryService().createItem(data))
}

export function usePartialUpdateElibraryFile() {
  return useApiMutation((variables: { id: number; data: PatchedLibraryFileUpdateRequest }) =>
    getElibraryService().partialUpdateFile(variables.id, variables.data)
  )
}

export function useDeleteElibraryFile() {
  return useApiMutation((id: number) => getElibraryService().deleteFile(id))
}

export function useShareElibraryFile() {
  return useApiMutation((variables: { id: number; data: LibraryShareCreateRequest }) =>
    getElibraryService().shareFile(variables.id, variables.data)
  )
}

export function useBulkShareElibraryFiles() {
  return useApiMutation((data: components['schemas']['BulkShareCreateRequest']) =>
    getElibraryService().bulkShareFiles(data)
  )
}

export function useCreateElibraryFolder() {
  return useApiMutation((data: LibraryFolderCreateRequest) =>
    getElibraryService().createFolder(data)
  )
}

export function usePartialUpdateElibraryFolder() {
  return useApiMutation((variables: { id: number; data: PatchedLibraryFolderUpdateRequest }) =>
    getElibraryService().partialUpdateFolder(variables.id, variables.data)
  )
}

export function useDeleteElibraryFolder() {
  return useApiMutation((id: number) => getElibraryService().deleteFolder(id))
}

export function useDeleteElibraryShare() {
  return useApiMutation((id: number) => getElibraryService().deleteShare(id))
}

export function useToggleElibraryFavorite(
  options?: Omit<UseMutationOptions<ToggleElibraryFavoriteResponse, Error, number>, 'mutationFn'>
) {
  return useApiMutation<ToggleElibraryFavoriteResponse, Error, number>(
    (id: number) => getElibraryService().toggleFavorite(id),
    {
      skipInvalidateOnSuccess: true,
      ...options,
    }
  )
}

export function useBulkUpdateElibraryItems() {
  return useApiMutation((data: ElibraryBulkUpdateRequest) =>
    getElibraryService().bulkUpdateItems(data)
  )
}

export function useElibraryItemHistories(
  id: number,
  params?: HistoriesParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    ['elibrary', 'items', id, 'histories', JSON.stringify(params || {})],
    () => getElibraryService().getItemHistories(id, params),
    { enabled: !!id && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useElibraryItemHistory(id: number, logId: string, options?: { enabled?: boolean }) {
  return useApiQuery(
    ['elibrary', 'items', id, 'history-detail', logId],
    () => getElibraryService().getItemHistory(id, logId),
    { enabled: !!id && !!logId && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useElibraryItemsTrash(options?: { enabled?: boolean }) {
  return useApiQuery(['elibrary', 'items', 'trash'], () => getElibraryService().getItemsTrash(), {
    enabled: options?.enabled ?? true,
    staleTime: 1000 * 60 * 5,
  })
}

export function useRestoreElibraryItem() {
  return useApiMutation((id: number) => getElibraryService().restoreItem(id))
}

export function usePurgeElibraryItem() {
  return useApiMutation((id: number) => getElibraryService().purgeItem(id))
}

export function useCreateElibraryShareLink() {
  return useApiMutation(
    (variables: { id: number; data: components['schemas']['LibraryAccessTokenCreateRequest'] }) =>
      getElibraryService().createShareLink(variables.id, variables.data)
  )
}

export function useElibraryShareLinks(id: number, options?: { enabled?: boolean }) {
  return useApiQuery(
    ['elibrary', 'items', id, 'share-links'],
    () => getElibraryService().getShareLinks(id),
    { enabled: !!id && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useDeleteElibraryShareLink() {
  return useApiMutation((id: number) => getElibraryService().deleteShareLink(id))
}

export function useElibraryPublicLibrary(token: string, options?: { enabled?: boolean }) {
  return useApiQuery(
    ['elibrary', 'public-library', token],
    () => getElibraryService().getPublicLibrary(token),
    { enabled: !!token && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useRequestAccess() {
  return useApiMutation((variables: { id: number; message?: string }) =>
    getElibraryService().requestAccess(variables.id, variables.message)
  )
}

export function useElibraryAccessRequestsSummary(
  params?: GetElibraryAccessRequestsSummaryParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.ELIBRARY.ACCESS_REQUESTS.SUMMARY(params || {}),
    () => getElibraryService().getAccessRequestsSummary(params),
    {
      staleTime: 1000 * 60 * 5,
      enabled: options?.enabled ?? true,
    }
  )
}

export function useElibraryItemAccessRequests(
  id: number,
  params?: GetElibraryItemAccessRequestsParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.ELIBRARY.ACCESS_REQUESTS.LIST_BY_ITEM(id, params || {}),
    () => getElibraryService().getAccessRequests(id, params),
    {
      staleTime: 1000 * 60 * 5,
      enabled: !!id && (options?.enabled ?? true),
    }
  )
}

export function useUpdateAccessRequest() {
  return useApiMutation((variables: { id: number; status: 'approved' | 'rejected' }) =>
    getElibraryService().updateAccessRequest(variables.id, variables.status)
  )
}

export function useCancelAccessRequest() {
  return useApiMutation((id: number) => getElibraryService().cancelAccessRequest(id))
}
