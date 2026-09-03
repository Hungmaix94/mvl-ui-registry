import { BaseApiService } from '@/api/base-service'
import { ApiPaths, components, paths } from '@/api/schema'
import { QUERY_KEYS } from '@/constants'
import { useApiMutation, useApiQuery } from '@/hooks/useApiQuery'

export type ImportedBonusBatch = components['schemas']['ImportedBonusBatch']
export type ImportedBonusBatchCreateRequest =
  components['schemas']['ImportedBonusBatchCreateRequest']
export type PatchedImportedBonusEntriesUpdateRequest =
  components['schemas']['PatchedImportedBonusEntriesUpdateRequest']
export type ImportedBonusBatchRequest = components['schemas']['ImportedBonusBatchRequest']

export type ImportedBonusEntryWriteRequest = components['schemas']['ImportedBonusEntryWriteRequest']
export type PatchedImportedBonusEntryWriteRequest =
  components['schemas']['PatchedImportedBonusEntryWriteRequest']
/**
 * Enum sinh từ schema — xuất lại dưới tên gọn. Phải dùng chính enum của schema chứ
 * không gõ lại object chuỗi: schema sinh `enum` thật của TS, chuỗi thường không gán được.
 */
export { ImportedBonusEntryBonus_type as BonusType } from '@/api/schema'
export type ImportedBonusEntryDetail = components['schemas']['ImportedBonusEntryDetail']
export type GetImportedBonusEntriesParams =
  paths['/api/accounting/imported-bonus-entries/']['get']['parameters']['query']

export type GetImportedBonusBatchesParams =
  paths['/api/accounting/imported-bonus-batches/']['get']['parameters']['query']

class ImportedBonusService extends BaseApiService {
  async getImportedBonusBatches(params?: GetImportedBonusBatchesParams) {
    return await this.getPaginated(ApiPaths.accounting_imported_bonus_batches_list, params)
  }

  async getImportedBonusBatch(id: number) {
    return await this.get(ApiPaths.accounting_imported_bonus_batches_retrieve, { path: { id } })
  }

  async createImportedBonusBatch(data: ImportedBonusBatchCreateRequest) {
    return await this.post(ApiPaths.accounting_imported_bonus_batches_create, data)
  }

  async setImportedBonusBatchEntries(id: number, data: PatchedImportedBonusEntriesUpdateRequest) {
    return await this.patch(
      ApiPaths.accounting_imported_bonus_batches_set_entries_partial_update,
      data,
      {
        path: { id },
      }
    )
  }

  async confirmImportedBonusBatch(id: number, data?: ImportedBonusBatchRequest) {
    return await this.post(
      ApiPaths.accounting_imported_bonus_batches_confirm_create,
      data || ({} as any),
      {
        path: { id },
      }
    )
  }

  async voidImportedBonusBatch(id: number, data: ImportedBonusBatchRequest) {
    return await this.post(ApiPaths.accounting_imported_bonus_batches_void_create, data, {
      path: { id },
    })
  }

  async getImportedBonusEntries(params?: GetImportedBonusEntriesParams) {
    return await this.getPaginated(ApiPaths.accounting_imported_bonus_entries_list, params)
  }

  async createImportedBonusEntry(data: ImportedBonusEntryWriteRequest) {
    return await this.post(ApiPaths.accounting_imported_bonus_entries_create, data)
  }

  async updateImportedBonusEntry(id: number, data: PatchedImportedBonusEntryWriteRequest) {
    return await this.patch(ApiPaths.accounting_imported_bonus_entries_partial_update, data, {
      path: { id },
    })
  }

  async deleteImportedBonusEntry(id: number) {
    return await this.delete(ApiPaths.accounting_imported_bonus_entries_destroy, {
      path: { id },
    })
  }
}

let _service: ImportedBonusService | null = null

export function getImportedBonusService(): ImportedBonusService {
  if (!_service) _service = new ImportedBonusService()
  return _service
}

export function useImportedBonusBatches(
  params?: GetImportedBonusBatchesParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.IMPORTED_BONUS_BATCHES.LIST(params || {}),
    () => getImportedBonusService().getImportedBonusBatches(params),
    { enabled: options?.enabled ?? true, staleTime: 1000 * 60 * 5 }
  )
}

export function useImportedBonusBatch(id: number, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.IMPORTED_BONUS_BATCHES.DETAIL(id),
    () => getImportedBonusService().getImportedBonusBatch(id),
    { enabled: !!id && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useCreateImportedBonusBatch() {
  return useApiMutation((data: ImportedBonusBatchCreateRequest) =>
    getImportedBonusService().createImportedBonusBatch(data)
  )
}

export function useSetImportedBonusBatchEntries() {
  return useApiMutation(
    (variables: { id: number; data: PatchedImportedBonusEntriesUpdateRequest }) =>
      getImportedBonusService().setImportedBonusBatchEntries(variables.id, variables.data)
  )
}

export function useConfirmImportedBonusBatch() {
  return useApiMutation((id: number) => getImportedBonusService().confirmImportedBonusBatch(id))
}

export function useVoidImportedBonusBatch() {
  return useApiMutation((variables: { id: number; data: ImportedBonusBatchRequest }) =>
    getImportedBonusService().voidImportedBonusBatch(variables.id, variables.data)
  )
}

export function useImportedBonusEntries(
  params?: GetImportedBonusEntriesParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.IMPORTED_BONUS_ENTRIES.LIST(params || {}),
    () => getImportedBonusService().getImportedBonusEntries(params),
    { enabled: options?.enabled ?? true, staleTime: 1000 * 60 * 5 }
  )
}

export function useCreateImportedBonusEntry() {
  return useApiMutation((data: ImportedBonusEntryWriteRequest) =>
    getImportedBonusService().createImportedBonusEntry(data)
  )
}

export function useUpdateImportedBonusEntry() {
  return useApiMutation((variables: { id: number; data: PatchedImportedBonusEntryWriteRequest }) =>
    getImportedBonusService().updateImportedBonusEntry(variables.id, variables.data)
  )
}

export function useDeleteImportedBonusEntry() {
  return useApiMutation((id: number) => getImportedBonusService().deleteImportedBonusEntry(id))
}
