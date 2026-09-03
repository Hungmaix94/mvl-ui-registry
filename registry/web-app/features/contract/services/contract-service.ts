import { BaseApiService } from '@/api/base-service'
import { ApiPaths, components, paths } from '@/api/schema'
import { QUERY_KEYS } from '@/constants'
import { useApiMutation, useApiQuery } from '@/hooks/useApiQuery'
import { useExport } from '@/hooks/useExport'
import type { HistoriesParams } from '@/types/hrm-types'
import { ContractImportMode } from '@/constants/api-schema-aliases'

// ===== TYPE DEFINITIONS =====
export type Contract = components['schemas']['Contract']
export type ContractList = components['schemas']['ContractList']
export type ContractRequest = components['schemas']['ContractRequest']
export type PatchedContractRequest = components['schemas']['PatchedContractRequest']
export type PatchedContractUpdateInsuranceRequest =
  components['schemas']['PatchedContractUpdateInsuranceRequest']
export type ContractImportOptionsRequest = components['schemas']['ContractImportOptionsRequest']
export type ContractImportStartRequest = components['schemas']['ContractImportStartRequest']

export type GetContractsParams = paths['/api/hrm/contracts/']['get']['parameters']['query']
export type GetContractsExportParams =
  paths['/api/hrm/contracts/export/']['get']['parameters']['query']
export type GetContractExportDocumentParams =
  paths['/api/hrm/contracts/{id}/export-document/']['get']['parameters']['query']

// ===== SERVICE CLASS =====
export class ContractService extends BaseApiService {
  async getContracts(params?: GetContractsParams) {
    return await this.getPaginated(ApiPaths.hrm_contracts_list, params)
  }

  async getContract(id: number) {
    return await this.get(ApiPaths.hrm_contracts_retrieve, {
      path: { id: id },
    })
  }

  async createContract(contractData: ContractRequest) {
    return await this.post(ApiPaths.hrm_contracts_create, contractData)
  }

  async updateContract(id: number, contractData: ContractRequest) {
    return await this.put(ApiPaths.hrm_contracts_update, contractData, { path: { id } })
  }

  async partialUpdateContract(id: number, contractData: PatchedContractRequest) {
    return await this.patch(ApiPaths.hrm_contracts_partial_update, contractData, { path: { id } })
  }

  async updateContractInsurance(id: number, data: PatchedContractUpdateInsuranceRequest) {
    return await this.patch(ApiPaths.hrm_contracts_update_insurance_partial_update, data, {
      path: { id },
    })
  }

  async deleteContract(id: number) {
    return await this.delete(ApiPaths.hrm_contracts_destroy, { path: { id } })
  }

  async publishContract(id: number) {
    return await this.post(ApiPaths.hrm_contracts_publish_create, undefined, { path: { id } })
  }

  async startContractsImport(data: ContractImportStartRequest) {
    return await this.post(ApiPaths.hrm_contracts_import_create, data)
  }

  async getContractsImportTemplate(mode?: ContractImportMode) {
    return await this.get(ApiPaths.hrm_contracts_import_template_retrieve, {
      query: { mode },
    })
  }

  async exportContractDocument(id: number, params?: GetContractExportDocumentParams) {
    return await this.get(ApiPaths.hrm_contracts_export_document_retrieve, {
      path: { id: id },
      query: params,
    })
  }

  async exportContracts(params?: GetContractsExportParams) {
    return await this.get(ApiPaths.hrm_contracts_export_retrieve, {
      query: params,
    })
  }

  async getContractHistories(id: number, params?: HistoriesParams) {
    return await this.get(ApiPaths.hrm_contracts_histories_retrieve, {
      path: { id: String(id) },
      query: params,
    })
  }
}

// ===== SERVICE SINGLETON =====
let _contractService: ContractService | null = null

export function getContractService(): ContractService {
  if (!_contractService) {
    _contractService = new ContractService()
  }
  return _contractService
}

// ===== REACT QUERY HOOKS =====
export function useContracts(params?: GetContractsParams, enabled: boolean = true) {
  return useApiQuery(
    QUERY_KEYS.HRM.CONTRACTS.LIST(params || {}),
    () => getContractService().getContracts(params),
    {
      staleTime: 1000 * 60 * 5, // 5 minutes
      enabled,
    }
  )
}

export function useContract(id: number) {
  return useApiQuery(
    QUERY_KEYS.HRM.CONTRACTS.DETAIL(id),
    () => getContractService().getContract(id),
    {
      enabled: !!id,
      staleTime: 1000 * 60 * 5, // 5 minutes
    }
  )
}

export function useCreateContract() {
  return useApiMutation((data: ContractRequest) => getContractService().createContract(data))
}

export function useUpdateContract() {
  return useApiMutation(({ id, data }: { id: number; data: ContractRequest }) =>
    getContractService().updateContract(id, data)
  )
}

export function usePartialUpdateContract() {
  return useApiMutation(({ id, data }: { id: number; data: PatchedContractRequest }) =>
    getContractService().partialUpdateContract(id, data)
  )
}

export function useUpdateContractInsurance() {
  return useApiMutation(
    ({ id, data }: { id: number; data: PatchedContractUpdateInsuranceRequest }) =>
      getContractService().updateContractInsurance(id, data)
  )
}

export function useDeleteContract() {
  return useApiMutation((id: number) => getContractService().deleteContract(id))
}

export function usePublishContract() {
  return useApiMutation((id: number) => getContractService().publishContract(id))
}

export function useContractImportTemplate(options?: {
  enabled?: boolean
  mode?: ContractImportMode
}) {
  return useApiQuery(
    QUERY_KEYS.HRM.CONTRACTS.IMPORT_TEMPLATE(),
    () => getContractService().getContractsImportTemplate(options?.mode),
    {
      staleTime: 1000 * 60 * 5, // 5 minutes
      enabled: options?.enabled ?? true,
    }
  )
}

export function useStartContractImport() {
  return useApiMutation((data: ContractImportStartRequest) =>
    getContractService().startContractsImport(data)
  )
}

export function useExportContractDocument() {
  return useApiMutation(
    ({ id, params }: { id: number; params?: GetContractExportDocumentParams }) =>
      getContractService().exportContractDocument(id, params)
  )
}

export function useContractExport() {
  return useExport({
    exportFunction: (params?: GetContractsExportParams) =>
      getContractService().exportContracts(params),
    defaultFilename: 'contracts',
  })
}
