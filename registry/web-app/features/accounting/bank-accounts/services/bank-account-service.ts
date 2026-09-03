import { BaseApiService } from '@/api/base-service'
import { ApiPaths, components, paths } from '@/api/schema'
import { QUERY_KEYS } from '@/constants'
import { useApiMutation, useApiQuery } from '@/hooks/useApiQuery'

export type CompanyBankAccount = components['schemas']['CompanyBankAccount']
export type CompanyBankAccountRequest = components['schemas']['CompanyBankAccountRequest']
export type PatchedCompanyBankAccountRequest =
  components['schemas']['PatchedCompanyBankAccountRequest']
export type GetBankAccountsParams =
  paths['/api/accounting/bank-accounts/']['get']['parameters']['query']
export type CompanyBankAccountDropdownResult =
  components['schemas']['CompanyBankAccountDropdownResult']

class BankAccountService extends BaseApiService {
  async getBankAccounts(params?: GetBankAccountsParams) {
    return await this.getPaginated(ApiPaths.accounting_bank_accounts_list, params)
  }

  async createBankAccount(data: CompanyBankAccountRequest) {
    return await this.post(ApiPaths.accounting_bank_accounts_create, data)
  }

  async getBankAccount(id: number) {
    return await this.get(ApiPaths.accounting_bank_accounts_retrieve, { path: { id } })
  }

  async updateBankAccount(id: number, data: CompanyBankAccountRequest) {
    return await this.put(ApiPaths.accounting_bank_accounts_update, data, { path: { id } })
  }

  async partialUpdateBankAccount(id: number, data: PatchedCompanyBankAccountRequest) {
    return await this.patch(ApiPaths.accounting_bank_accounts_partial_update, data, {
      path: { id },
    })
  }

  async deleteBankAccount(id: number) {
    return await this.delete(ApiPaths.accounting_bank_accounts_destroy, { path: { id } })
  }

  async deactivateBankAccount(id: number) {
    // Dedicated action — backend ignores body for this endpoint, but the generated
    // schema types it with CompanyBankAccountRequest. Cast `{}` to satisfy the type.
    return await this.post(
      ApiPaths.accounting_bank_accounts_deactivate_create,
      {} as CompanyBankAccountRequest,
      { path: { id } }
    )
  }

  async setDefaultBankAccount(id: number) {
    // Dedicated action — the generated schema types this endpoint with no request body.
    return await this.post(
      ApiPaths.accounting_bank_accounts_set_default_create,
      undefined as never,
      { path: { id } }
    )
  }

  async getBankAccountDropdown() {
    return await this.get(ApiPaths.accounting_bank_accounts_dropdown_retrieve)
  }

  async getBankAccountHistories(id: number, params?: Record<string, unknown>) {
    return await this.get(ApiPaths.accounting_bank_accounts_histories_retrieve, {
      path: { id: String(id) },
      query: params,
    })
  }

  async getBankAccountHistory(id: number, logId: string) {
    return await this.get(ApiPaths.accounting_bank_accounts_history_retrieve, {
      path: { id: String(id), log_id: logId },
    })
  }
}

let _service: BankAccountService | null = null

export function getBankAccountService(): BankAccountService {
  if (!_service) _service = new BankAccountService()
  return _service
}

export function useBankAccounts(params?: GetBankAccountsParams, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.BANK_ACCOUNTS.LIST(params || {}),
    () => getBankAccountService().getBankAccounts(params),
    { enabled: options?.enabled ?? true, staleTime: 1000 * 60 * 5 }
  )
}

export function useBankAccount(id: number, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.BANK_ACCOUNTS.DETAIL(id),
    () => getBankAccountService().getBankAccount(id),
    { enabled: !!id && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useCreateBankAccount() {
  return useApiMutation((data: CompanyBankAccountRequest) =>
    getBankAccountService().createBankAccount(data)
  )
}

export function useUpdateBankAccount() {
  return useApiMutation((variables: { id: number; data: CompanyBankAccountRequest }) =>
    getBankAccountService().updateBankAccount(variables.id, variables.data)
  )
}

export function usePartialUpdateBankAccount() {
  return useApiMutation((variables: { id: number; data: PatchedCompanyBankAccountRequest }) =>
    getBankAccountService().partialUpdateBankAccount(variables.id, variables.data)
  )
}

export function useDeleteBankAccount() {
  return useApiMutation((id: number) => getBankAccountService().deleteBankAccount(id))
}

export function useDeactivateBankAccount() {
  return useApiMutation((id: number) => getBankAccountService().deactivateBankAccount(id))
}

export function useSetDefaultBankAccount() {
  return useApiMutation((id: number) => getBankAccountService().setDefaultBankAccount(id))
}

export function useBankAccountDropdown(options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.BANK_ACCOUNTS.DROPDOWN(),
    () => getBankAccountService().getBankAccountDropdown(),
    { enabled: options?.enabled ?? true, staleTime: 1000 * 60 * 5 }
  )
}

export function useBankAccountHistories(
  id: number,
  params?: Record<string, unknown>,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.BANK_ACCOUNTS.HISTORIES(id, params || {}),
    () => getBankAccountService().getBankAccountHistories(id, params),
    { enabled: !!id && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useBankAccountHistory(id: number, logId: string, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.BANK_ACCOUNTS.HISTORY_DETAIL(id, logId),
    () => getBankAccountService().getBankAccountHistory(id, logId),
    { enabled: !!id && !!logId && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}
