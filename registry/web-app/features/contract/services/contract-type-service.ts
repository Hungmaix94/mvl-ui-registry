import { BaseApiService } from '@/api/base-service'
import { ApiPaths, components, paths } from '@/api/schema'
import { QUERY_KEYS } from '@/constants'
import { useApiMutation, useApiQuery } from '@/hooks/useApiQuery'
import { useExport } from '@/hooks/useExport'
import type { HistoriesParams } from '@/types/hrm-types'

// ===== TYPE DEFINITIONS =====
export type ContractType = components['schemas']['ContractType']
export type ContractTypeRequest = components['schemas']['ContractTypeRequest']
export type PatchedContractTypeRequest = components['schemas']['PatchedContractTypeRequest']

export type GetContractTypesParams = paths['/api/hrm/contract-types/']['get']['parameters']['query']
export type GetContractTypesExportParams =
  paths['/api/hrm/contract-types/export/']['get']['parameters']['query']

// ===== SERVICE CLASS =====
export class ContractTypeService extends BaseApiService {
  async getContractTypes(params?: GetContractTypesParams) {
    return await this.getPaginated(ApiPaths.hrm_contract_types_list, params)
  }

  async createContractType(contractTypeData: ContractTypeRequest) {
    return await this.post(ApiPaths.hrm_contract_types_create, contractTypeData)
  }

  async getContractType(id: number) {
    return await this.get(ApiPaths.hrm_contract_types_retrieve, {
      path: { id: id },
    })
  }

  async updateContractType(id: number, contractTypeData: ContractTypeRequest) {
    return await this.put(ApiPaths.hrm_contract_types_update, contractTypeData, { path: { id } })
  }

  async partialUpdateContractType(id: number, contractTypeData: PatchedContractTypeRequest) {
    return await this.patch(ApiPaths.hrm_contract_types_partial_update, contractTypeData, {
      path: { id },
    })
  }

  async deleteContractType(id: number) {
    return await this.delete(ApiPaths.hrm_contract_types_destroy, { path: { id } })
  }

  async exportContractTypes(params?: GetContractTypesExportParams) {
    return await this.get(ApiPaths.hrm_contract_types_export_retrieve, {
      query: params,
    })
  }

  async getContractTypeHistories(id: number, params?: HistoriesParams) {
    return await this.get(ApiPaths.hrm_contract_types_histories_retrieve, {
      path: { id: String(id) },
      query: params,
    })
  }
}

// ===== SERVICE SINGLETON =====
let _contractTypeService: ContractTypeService | null = null

export function getContractTypeService(): ContractTypeService {
  if (!_contractTypeService) {
    _contractTypeService = new ContractTypeService()
  }
  return _contractTypeService
}

// ===== REACT QUERY HOOKS =====
export function useContractTypes(params?: GetContractTypesParams, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.HRM.CONTRACT_TYPES.LIST(params || {}),
    () => getContractTypeService().getContractTypes(params),
    {
      staleTime: 1000 * 60 * 5, // 5 minutes
      enabled: options?.enabled ?? true,
    }
  )
}

export function useContractType(id: number) {
  return useApiQuery(
    QUERY_KEYS.HRM.CONTRACT_TYPES.DETAIL(id),
    () => getContractTypeService().getContractType(id),
    {
      enabled: !!id,
      staleTime: 1000 * 60 * 5, // 5 minutes
    }
  )
}

export function useCreateContractType() {
  return useApiMutation((data: ContractTypeRequest) =>
    getContractTypeService().createContractType(data)
  )
}

export function useUpdateContractType() {
  return useApiMutation(({ id, data }: { id: number; data: ContractTypeRequest }) =>
    getContractTypeService().updateContractType(id, data)
  )
}

export function usePartialUpdateContractType() {
  return useApiMutation(({ id, data }: { id: number; data: PatchedContractTypeRequest }) =>
    getContractTypeService().partialUpdateContractType(id, data)
  )
}

export function useDeleteContractType() {
  return useApiMutation((id: number) => getContractTypeService().deleteContractType(id))
}

export function useExportContractTypes() {
  return useExport({
    exportFunction: (params?: GetContractTypesExportParams) =>
      getContractTypeService().exportContractTypes(params),
    defaultFilename: 'contract-types',
  })
}

// Alias for consistency
export const useContractTypeExport = useExportContractTypes
