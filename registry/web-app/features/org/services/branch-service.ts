import { BaseApiService } from '@/api/base-service'
import { ApiPaths, components, paths } from '@/api/schema'
import { QUERY_KEYS } from '@/constants'
import { useApiMutation, useApiQuery } from '@/hooks/useApiQuery'
import type { HistoriesParams } from '@/types/hrm-types'
import { fetchAllPaginatedResults, HRM_LIST_PAGE_SIZE_MAX } from '@/utils/fetch-all-paginated'

// ===== TYPE DEFINITIONS =====
export type Branch = components['schemas']['Branch']
export type BranchRequest = components['schemas']['BranchRequest']
export type PatchedBranchRequest = components['schemas']['PatchedBranchRequest']
export type PaginatedBranchList = components['schemas']['PaginatedBranchList']

export type BranchContactInfo = components['schemas']['BranchContactInfo']
export type BranchContactInfoRequest = components['schemas']['BranchContactInfoRequest']
export type PatchedBranchContactInfoRequest =
  components['schemas']['PatchedBranchContactInfoRequest']
export type PaginatedBranchContactInfoList = components['schemas']['PaginatedBranchContactInfoList']

export type GetBranchesParams = paths['/api/hrm/branches/']['get']['parameters']['query']
export type BranchDropdown = components['schemas']['BranchDropdown']
export type PaginatedBranchDropdownList = components['schemas']['PaginatedBranchDropdownList']
export type GetBranchesDropdownParams =
  paths['/api/hrm/branches/dropdown/']['get']['parameters']['query']
export type GetBranchContactInfosParams =
  paths['/api/hrm/branch-contact-infos/']['get']['parameters']['query']
export type GetBranchesExportParams =
  paths['/api/hrm/branches/export/']['get']['parameters']['query']

// ===== SERVICE CLASS =====
export class BranchService extends BaseApiService {
  // ===== BRANCHES =====
  async getBranches(params?: GetBranchesParams) {
    return await this.getPaginated(ApiPaths.hrm_branches_list, params)
  }

  async createBranch(branchData: BranchRequest) {
    return await this.post(ApiPaths.hrm_branches_create, branchData)
  }

  async getBranch(id: number) {
    return await this.get(ApiPaths.hrm_branches_retrieve, { path: { id: id } })
  }

  async updateBranch(id: number, branchData: BranchRequest) {
    return await this.put(ApiPaths.hrm_branches_update, branchData, {
      path: { id },
    })
  }

  async partialUpdateBranch(id: number, branchData: PatchedBranchRequest) {
    return await this.patch(ApiPaths.hrm_branches_partial_update, branchData, { path: { id } })
  }

  async deleteBranch(id: number) {
    return await this.delete(ApiPaths.hrm_branches_destroy, { path: { id } })
  }

  async getBranchHistories(id: number, params?: HistoriesParams) {
    return await this.get(ApiPaths.hrm_branches_histories_retrieve, {
      path: { id: String(id) },
      query: params,
    })
  }

  async getBranchesDropdown(params?: GetBranchesDropdownParams) {
    return await this.getPaginated(ApiPaths.hrm_branches_dropdown_list, params)
  }

  /**
   * Export branches to XLSX
   */
  async exportBranches(params?: GetBranchesExportParams) {
    return await this.get(ApiPaths.hrm_branches_export_retrieve, {
      query: params,
    })
  }

  // ===== BRANCH CONTACT INFOS =====
  async getBranchContactInfos(params?: GetBranchContactInfosParams) {
    return await this.getPaginated(ApiPaths.hrm_branch_contact_infos_list, params)
  }

  async createBranchContactInfo(contactInfoData: BranchContactInfoRequest) {
    return await this.post(ApiPaths.hrm_branch_contact_infos_create, contactInfoData)
  }

  async getBranchContactInfo(id: number) {
    return await this.get(ApiPaths.hrm_branch_contact_infos_retrieve, { path: { id: id } })
  }

  async updateBranchContactInfo(id: number, contactInfoData: BranchContactInfoRequest) {
    return await this.put(ApiPaths.hrm_branch_contact_infos_update, contactInfoData, {
      path: { id },
    })
  }

  async partialUpdateBranchContactInfo(
    id: number,
    contactInfoData: Partial<BranchContactInfoRequest>
  ) {
    return await this.patch(ApiPaths.hrm_branch_contact_infos_partial_update, contactInfoData, {
      path: { id },
    })
  }

  async deleteBranchContactInfo(id: number) {
    return await this.delete(ApiPaths.hrm_branch_contact_infos_destroy, { path: { id } })
  }

  async getBranchContactInfoHistories(id: number, params?: HistoriesParams) {
    return await this.get(ApiPaths.hrm_branch_contact_infos_histories_retrieve, {
      path: { id: String(id) },
      query: params,
    })
  }

  async getBranchContactInfoHistory(id: number, logId: string) {
    return await this.get(ApiPaths.hrm_branch_contact_infos_history_retrieve, {
      path: { id: String(id), log_id: logId },
    })
  }
}

// ===== SERVICE SINGLETON =====
let _branchService: BranchService | null = null

export function getBranchService(): BranchService {
  if (!_branchService) {
    _branchService = new BranchService()
  }
  return _branchService
}

// ===== REACT QUERY HOOKS =====
export function useBranches(params?: GetBranchesParams, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.HRM.BRANCHES.LIST(params || {}),
    () => getBranchService().getBranches(params),
    { staleTime: 1000 * 60 * 10, enabled: options?.enabled !== false }
  )
}

/** Fetches every branch page (backend `page_size` max 100). */
export function useAllBranches(options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.HRM.BRANCHES.LIST({ fetchAll: true }),
    () =>
      fetchAllPaginatedResults<Branch>((page) =>
        getBranchService().getBranches({ page, page_size: HRM_LIST_PAGE_SIZE_MAX })
      ),
    { staleTime: 1000 * 60 * 10, enabled: options?.enabled !== false }
  )
}

export function useBranch(id: number) {
  return useApiQuery(QUERY_KEYS.HRM.BRANCHES.DETAIL(id), () => getBranchService().getBranch(id), {
    enabled: !!id,
    staleTime: 1000 * 60 * 10,
  })
}

export function useCreateBranch() {
  return useApiMutation((data: BranchRequest) => getBranchService().createBranch(data))
}

export function useUpdateBranch() {
  return useApiMutation(({ id, data }: { id: number; data: BranchRequest }) =>
    getBranchService().updateBranch(id, data)
  )
}

export function usePartialUpdateBranch() {
  return useApiMutation(({ id, data }: { id: number; data: PatchedBranchRequest }) =>
    getBranchService().partialUpdateBranch(id, data)
  )
}

export function useDeleteBranch() {
  return useApiMutation((id: number) => getBranchService().deleteBranch(id))
}

export function useBranchesDropdown(
  params?: GetBranchesDropdownParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.HRM.BRANCHES.DROPDOWN(params || {}),
    () => getBranchService().getBranchesDropdown(params),
    {
      staleTime: 1000 * 60 * 10,
      enabled: options?.enabled !== false,
    }
  )
}

// ===== BRANCH CONTACT INFOS HOOKS =====
export function useBranchContactInfos(params?: GetBranchContactInfosParams) {
  return useApiQuery(
    QUERY_KEYS.HRM.BRANCH_CONTACT_INFOS.LIST(params || {}),
    () => getBranchService().getBranchContactInfos(params),
    {
      staleTime: 1000 * 60 * 10,
      enabled: !!params?.branch,
    }
  )
}

export function useCreateBranchContactInfo() {
  return useApiMutation((data: BranchContactInfoRequest) =>
    getBranchService().createBranchContactInfo(data)
  )
}

export function useUpdateBranchContactInfo() {
  return useApiMutation(({ id, data }: { id: number; data: BranchContactInfoRequest }) =>
    getBranchService().updateBranchContactInfo(id, data)
  )
}

export function usePartialUpdateBranchContactInfo() {
  return useApiMutation(({ id, data }: { id: number; data: Partial<BranchContactInfoRequest> }) =>
    getBranchService().partialUpdateBranchContactInfo(id, data)
  )
}

export function useDeleteBranchContactInfo() {
  return useApiMutation((id: number) => getBranchService().deleteBranchContactInfo(id))
}

export function useBranchContactInfoHistories(id: number, params?: HistoriesParams) {
  return useApiQuery(
    QUERY_KEYS.HRM.BRANCH_CONTACT_INFOS.HISTORIES(id, params || {}),
    () => getBranchService().getBranchContactInfoHistories(id, params),
    { enabled: !!id, staleTime: 1000 * 60 * 5 }
  )
}

export function useBranchContactInfoHistory(id: number, logId: string) {
  return useApiQuery(
    QUERY_KEYS.HRM.BRANCH_CONTACT_INFOS.HISTORY_DETAIL(id, logId),
    () => getBranchService().getBranchContactInfoHistory(id, logId),
    { enabled: !!id && !!logId, staleTime: 1000 * 60 * 5 }
  )
}
