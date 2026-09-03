import { BaseApiService } from '@/api/base-service.ts'
import type { components, operations } from '@/api/schema.ts'
import { ApiPaths } from '@/api/schema.ts'
import { QUERY_KEYS } from '@/constants'
import { useApiMutation, useApiQuery } from '@/hooks/useApiQuery'

export type Collaborator = components['schemas']['Collaborator']
export type CollaboratorRequest = components['schemas']['CollaboratorRequest']
export type PatchedCollaboratorRequest = components['schemas']['PatchedCollaboratorRequest']
export type CollaboratorNested = components['schemas']['CollaboratorNested']
export type PaginatedCollaboratorList = components['schemas']['PaginatedCollaboratorList']

/** Payload gọn cho picker: `{ id, code, name, phone, id_number }` — không kèm bank/địa chỉ/ghi chú. */
export type CollaboratorDropdown = components['schemas']['CollaboratorDropdown']
export type PaginatedCollaboratorDropdownList =
  components['schemas']['PaginatedCollaboratorDropdownList']

export type GetCollaboratorsParams = operations['sales_collaborators_list']['parameters']['query']
export type GetCollaboratorsDropdownParams =
  operations['sales_collaborators_dropdown_list']['parameters']['query']
export type GetCollaboratorHistoriesParams =
  operations['sales_collaborators_histories_retrieve']['parameters']['query']

export class CollaboratorService extends BaseApiService {
  public async getCollaborators(params?: GetCollaboratorsParams) {
    return await this.getPaginated(ApiPaths.sales_collaborators_list, params)
  }

  /**
   * Danh sách CTV rút gọn cho các ô chọn (picker). `search` của endpoint này khớp mã, họ tên VÀ
   * CMND/CCCD (đã verify trên API thật 2026-08-03), nên không cần lọc `id_number` riêng như
   * endpoint list. Màn danh sách CTV vẫn dùng `getCollaborators` vì cần đủ trường để hiển thị.
   */
  public async getCollaboratorsDropdown(params?: GetCollaboratorsDropdownParams) {
    return await this.getPaginated(ApiPaths.sales_collaborators_dropdown_list, params)
  }

  public async getCollaborator(id: number) {
    return await this.get(ApiPaths.sales_collaborators_retrieve, { path: { id } })
  }

  public async createCollaborator(data: CollaboratorRequest) {
    return await this.post(ApiPaths.sales_collaborators_create, data)
  }

  public async updateCollaborator(id: number, data: CollaboratorRequest) {
    return await this.put(ApiPaths.sales_collaborators_update, data, { path: { id } })
  }

  public async partialUpdateCollaborator(id: number, data: PatchedCollaboratorRequest) {
    return await this.patch(ApiPaths.sales_collaborators_partial_update, data, { path: { id } })
  }

  public async deleteCollaborator(id: number) {
    return await this.delete(ApiPaths.sales_collaborators_destroy, { path: { id } })
  }

  public async getCollaboratorHistories(id: number, params?: GetCollaboratorHistoriesParams) {
    return await this.get(ApiPaths.sales_collaborators_histories_retrieve, {
      path: { id },
      query: params,
    })
  }
}

export const collaboratorService = new CollaboratorService()

export function useCollaborators(params?: GetCollaboratorsParams, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.COLLABORATORS.LIST(params || {}),
    () => collaboratorService.getCollaborators(params),
    { staleTime: 1000 * 60 * 5, enabled: options?.enabled ?? true }
  )
}

export function useCollaboratorsDropdown(
  params?: GetCollaboratorsDropdownParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.COLLABORATORS.DROPDOWN(params || {}),
    () => collaboratorService.getCollaboratorsDropdown(params),
    { staleTime: 1000 * 60 * 5, enabled: options?.enabled ?? true }
  )
}

export function useCollaborator(id: number, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.COLLABORATORS.DETAIL(id),
    () => collaboratorService.getCollaborator(id),
    { enabled: !!id && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useCreateCollaborator() {
  return useApiMutation((data: CollaboratorRequest) => collaboratorService.createCollaborator(data))
}

export function useUpdateCollaborator() {
  return useApiMutation(({ id, data }: { id: number; data: CollaboratorRequest }) =>
    collaboratorService.updateCollaborator(id, data)
  )
}

export function usePartialUpdateCollaborator() {
  return useApiMutation(({ id, data }: { id: number; data: PatchedCollaboratorRequest }) =>
    collaboratorService.partialUpdateCollaborator(id, data)
  )
}

export function useDeleteCollaborator() {
  return useApiMutation((id: number) => collaboratorService.deleteCollaborator(id))
}
