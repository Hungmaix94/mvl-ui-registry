import { BaseApiService } from '@/api/base-service'
import { ApiPaths, components, paths } from '@/api/schema'
import { QUERY_KEYS } from '@/constants'
import { useApiMutation, useApiQuery } from '@/hooks/useApiQuery'
import { useExport } from '@/hooks/useExport'
import type { HistoriesParams, ImportStartRequest } from '@/types/hrm-types'

// ===== TYPE DEFINITIONS =====
export type ContractAppendix = components['schemas']['ContractAppendix']
export type ContractAppendixList = components['schemas']['ContractAppendixList']
export type ContractAppendixRequest = components['schemas']['ContractAppendixRequest']
export type PatchedContractAppendixRequest = components['schemas']['PatchedContractAppendixRequest']
export type PaginatedContractAppendixListList =
  components['schemas']['PaginatedContractAppendixListList']

export type GetContractAppendicesParams =
  paths['/api/hrm/contract-appendices/']['get']['parameters']['query']
export type GetContractAppendicesExportParams =
  paths['/api/hrm/contract-appendices/export/']['get']['parameters']['query']

// ===== SERVICE CLASS =====
export class ContractAppendixService extends BaseApiService {
  async getContractAppendices(params?: GetContractAppendicesParams) {
    return await this.getPaginated(ApiPaths.hrm_contract_appendices_list, params)
  }

  async getContractAppendix(id: number) {
    return await this.get(ApiPaths.hrm_contract_appendices_retrieve, {
      path: { id: id },
    })
  }

  async createContractAppendix(contractAppendixData: ContractAppendixRequest) {
    return await this.post(ApiPaths.hrm_contract_appendices_create, contractAppendixData)
  }

  async updateContractAppendix(id: number, contractAppendixData: ContractAppendixRequest) {
    return await this.put(ApiPaths.hrm_contract_appendices_update, contractAppendixData, {
      path: { id },
    })
  }

  async partialUpdateContractAppendix(
    id: number,
    contractAppendixData: PatchedContractAppendixRequest
  ) {
    return await this.patch(ApiPaths.hrm_contract_appendices_partial_update, contractAppendixData, {
      path: { id },
    })
  }

  async deleteContractAppendix(id: number) {
    return await this.delete(ApiPaths.hrm_contract_appendices_destroy, { path: { id } })
  }

  async publishContractAppendix(id: number) {
    return await this.post(ApiPaths.hrm_contract_appendices_publish_create, undefined, {
      path: { id },
    })
  }

  async startContractAppendicesImport(data: ImportStartRequest) {
    return await this.post(ApiPaths.hrm_contract_appendices_import_create, data)
  }

  async getContractAppendicesImportTemplate() {
    return await this.get(ApiPaths.hrm_contract_appendices_import_template_retrieve)
  }

  async exportContractAppendices(params?: GetContractAppendicesExportParams) {
    return await this.get(ApiPaths.hrm_contract_appendices_export_retrieve, {
      query: params,
    })
  }

  async getContractAppendixHistories(id: number, params?: HistoriesParams) {
    return await this.get(ApiPaths.hrm_contract_appendices_histories_retrieve, {
      path: { id: String(id) },
      query: params,
    })
  }
}

// ===== SERVICE SINGLETON =====
let _contractAppendixService: ContractAppendixService | null = null

export function getContractAppendixService(): ContractAppendixService {
  if (!_contractAppendixService) {
    _contractAppendixService = new ContractAppendixService()
  }
  return _contractAppendixService
}

// ===== REACT QUERY HOOKS =====
export function useContractAppendices(params?: GetContractAppendicesParams) {
  return useApiQuery(
    QUERY_KEYS.HRM.CONTRACT_APPENDICES.LIST(params || {}),
    () => getContractAppendixService().getContractAppendices(params),
    {
      staleTime: 1000 * 60 * 5, // 5 minutes
    }
  )
}

export function useContractAppendix(id: number) {
  return useApiQuery(
    QUERY_KEYS.HRM.CONTRACT_APPENDICES.DETAIL(id),
    () => getContractAppendixService().getContractAppendix(id),
    {
      enabled: !!id,
      staleTime: 1000 * 60 * 5, // 5 minutes
    }
  )
}

export function useCreateContractAppendix() {
  return useApiMutation((data: ContractAppendixRequest) =>
    getContractAppendixService().createContractAppendix(data)
  )
}

export function useUpdateContractAppendix() {
  return useApiMutation(({ id, data }: { id: number; data: ContractAppendixRequest }) =>
    getContractAppendixService().updateContractAppendix(id, data)
  )
}

export function usePartialUpdateContractAppendix() {
  return useApiMutation(({ id, data }: { id: number; data: PatchedContractAppendixRequest }) =>
    getContractAppendixService().partialUpdateContractAppendix(id, data)
  )
}

export function useDeleteContractAppendix() {
  return useApiMutation((id: number) => getContractAppendixService().deleteContractAppendix(id))
}

export function usePublishContractAppendix() {
  return useApiMutation((id: number) => getContractAppendixService().publishContractAppendix(id))
}

export function useContractAppendixImportTemplate(options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.HRM.CONTRACT_APPENDICES.IMPORT_TEMPLATE(),
    () => getContractAppendixService().getContractAppendicesImportTemplate(),
    {
      staleTime: 1000 * 60 * 5, // 5 minutes
      enabled: options?.enabled ?? true,
    }
  )
}

export function useStartContractAppendixImport() {
  return useApiMutation((data: ImportStartRequest) =>
    getContractAppendixService().startContractAppendicesImport(data)
  )
}

export function useExportContractAppendices() {
  return useExport({
    exportFunction: (params?: GetContractAppendicesExportParams) =>
      getContractAppendixService().exportContractAppendices(params),
    defaultFilename: 'contract-appendices',
  })
}
