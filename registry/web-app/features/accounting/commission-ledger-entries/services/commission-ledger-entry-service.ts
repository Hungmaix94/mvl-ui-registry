import { BaseApiService } from '@/api/base-service'
import { ApiPaths, components, paths } from '@/api/schema'
import { QUERY_KEYS } from '@/constants'
import { useApiQuery } from '@/hooks/useApiQuery'

export type CommissionLedgerEntry = components['schemas']['CommissionLedgerEntry']
export type GetCommissionLedgerEntriesParams =
  paths['/api/accounting/commission-ledger-entries/']['get']['parameters']['query']

class CommissionLedgerEntryService extends BaseApiService {
  async getCommissionLedgerEntries(params?: GetCommissionLedgerEntriesParams) {
    return await this.getPaginated(ApiPaths.accounting_commission_ledger_entries_list, params)
  }

  async getCommissionLedgerEntry(id: number) {
    return await this.get(ApiPaths.accounting_commission_ledger_entries_retrieve, { path: { id } })
  }
}

let _service: CommissionLedgerEntryService | null = null

export function getCommissionLedgerEntryService(): CommissionLedgerEntryService {
  if (!_service) _service = new CommissionLedgerEntryService()
  return _service
}

export function useCommissionLedgerEntries(
  params?: GetCommissionLedgerEntriesParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.COMMISSION_LEDGER_ENTRIES.LIST(params || {}),
    () => getCommissionLedgerEntryService().getCommissionLedgerEntries(params),
    { enabled: options?.enabled ?? true, staleTime: 1000 * 60 * 5 }
  )
}

export function useCommissionLedgerEntry(id: number, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.COMMISSION_LEDGER_ENTRIES.DETAIL(id),
    () => getCommissionLedgerEntryService().getCommissionLedgerEntry(id),
    { enabled: !!id && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}
