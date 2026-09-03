import { BaseApiService } from '@/api/base-service'
import { ApiPaths, components, paths } from '@/api/schema'
import { QUERY_KEYS } from '@/constants'
import { useApiMutation, useApiQuery } from '@/hooks/useApiQuery'
import type {
  HistoriesParams,
  Nationality,
  GetNationalitiesParams,
  WorkSchedule,
} from '@/types/hrm-types'
import { useQueryClient } from '@tanstack/react-query'

// ===== TYPE DEFINITIONS =====
export type Bank = components['schemas']['Bank']
export type PaginatedBankList = components['schemas']['PaginatedBankList']
export type BankAccount = components['schemas']['BankAccount']
export type BankAccountRequest = components['schemas']['BankAccountRequest']
export type PatchedBankAccountRequest = components['schemas']['PatchedBankAccountRequest']
export type PaginatedBankAccountList = components['schemas']['PaginatedBankAccountList']

export type GetBanksParams = paths['/api/hrm/banks/']['get']['parameters']['query']
export type GetBankAccountsParams = paths['/api/hrm/bank-accounts/']['get']['parameters']['query']

// Re-export from hrm-types for convenience
export type { Nationality, GetNationalitiesParams, WorkSchedule, HistoriesParams }

// ===== SERVICE CLASS =====
export class CommonService extends BaseApiService {
  // ===== WORK SCHEDULES =====
  /**
   * Get all work schedules
   */
  async getWorkSchedules() {
    return await this.get(ApiPaths.hrm_work_schedules_list, {})
  }

  // ===== BANKS =====
  /**
   * Get all banks
   */
  async getBanks(params?: GetBanksParams) {
    return await this.getPaginated(ApiPaths.hrm_banks_list, params)
  }

  /**
   * Get bank by ID
   */
  async getBank(id: number) {
    return await this.get(ApiPaths.hrm_banks_retrieve, {
      path: { id: id },
    })
  }

  /**
   * Get bank histories
   */
  async getBankHistories(id: number, params?: HistoriesParams) {
    return await this.get(ApiPaths.hrm_banks_histories_retrieve, {
      path: { id: id },
      query: params,
    })
  }

  /**
   * Get bank history detail
   */
  async getBankHistory(id: number, logId: number) {
    return await this.get(ApiPaths.hrm_banks_history_retrieve, {
      path: { id: id, log_id: logId },
    })
  }

  // ===== BANK ACCOUNTS =====
  /**
   * Get all bank accounts
   */
  async getBankAccounts(params?: GetBankAccountsParams) {
    return await this.getPaginated(ApiPaths.hrm_bank_accounts_list, params)
  }

  /**
   * Create a new bank account
   */
  async createBankAccount(accountData: BankAccountRequest) {
    return await this.post(ApiPaths.hrm_bank_accounts_create, accountData)
  }

  /**
   * Get bank account by ID
   */
  async getBankAccount(id: number) {
    return await this.get(ApiPaths.hrm_bank_accounts_retrieve, {
      path: { id: id },
    })
  }

  /**
   * Update bank account
   */
  async updateBankAccount(id: number, accountData: BankAccountRequest) {
    return await this.put(ApiPaths.hrm_bank_accounts_update, accountData, {
      path: { id },
    })
  }

  /**
   * Partially update bank account
   */
  async partialUpdateBankAccount(id: number, accountData: PatchedBankAccountRequest) {
    return await this.patch(ApiPaths.hrm_bank_accounts_partial_update, accountData, {
      path: { id },
    })
  }

  /**
   * Delete bank account
   */
  async deleteBankAccount(id: number) {
    return await this.delete(ApiPaths.hrm_bank_accounts_destroy, { path: { id } })
  }

  /**
   * Get bank account histories
   */
  async getBankAccountHistories(id: number, params?: HistoriesParams) {
    return await this.get(ApiPaths.hrm_bank_accounts_histories_retrieve, {
      path: { id: id },
      query: params,
    })
  }

  /**
   * Get bank account history detail
   */
  async getBankAccountHistory(id: number, logId: number) {
    return await this.get(ApiPaths.hrm_bank_accounts_history_retrieve, {
      path: { id: id, log_id: logId },
    })
  }

  // ===== NATIONALITIES =====
  /**
   * Get all nationalities
   */
  async getNationalities(params?: GetNationalitiesParams) {
    return await this.getPaginated(ApiPaths.nationalities_list, params)
  }

  /**
   * Get nationality by ID
   */
  async getNationality(id: number) {
    return await this.get(ApiPaths.nationalities_retrieve, {
      path: { id },
    })
  }
}

// ===== SERVICE SINGLETON =====
let _commonService: CommonService | null = null

export function getCommonService(): CommonService {
  if (!_commonService) {
    _commonService = new CommonService()
  }
  return _commonService
}

// ===== REACT QUERY HOOKS =====
// ===== WORK SCHEDULES =====
export function useWorkSchedules() {
  return useApiQuery(
    ['hrm', 'work-schedules', 'list'],
    () => getCommonService().getWorkSchedules(),
    {
      staleTime: 1000 * 60 * 10, // 10 minutes - work schedules don't change often
    }
  )
}

// ===== BANKS =====
export function useBanks(params?: GetBanksParams) {
  return useApiQuery(
    QUERY_KEYS.HRM.BANKS.LIST(params || {}),
    () => getCommonService().getBanks(params),
    {
      staleTime: 1000 * 60 * 10, // 10 minutes
    }
  )
}

export function useBank(id: number) {
  return useApiQuery(QUERY_KEYS.HRM.BANKS.DETAIL(id), () => getCommonService().getBank(id), {
    enabled: !!id,
    staleTime: 1000 * 60 * 10, // 10 minutes
  })
}

export function useBankHistories(id: number, params?: HistoriesParams) {
  return useApiQuery(
    QUERY_KEYS.HRM.BANKS.HISTORIES(id, params || {}),
    () => getCommonService().getBankHistories(id, params),
    {
      enabled: !!id,
      staleTime: 1000 * 60 * 5, // 5 minutes
    }
  )
}

// ===== BANK ACCOUNTS =====
export function useBankAccounts(params?: GetBankAccountsParams) {
  return useApiQuery(
    QUERY_KEYS.HRM.BANK_ACCOUNTS.LIST(params || {}),
    () => getCommonService().getBankAccounts(params),
    {
      staleTime: 1000 * 60 * 5, // 5 minutes
    }
  )
}

export function useBankAccount(id: number) {
  return useApiQuery(
    QUERY_KEYS.HRM.BANK_ACCOUNTS.DETAIL(id),
    () => getCommonService().getBankAccount(id),
    {
      enabled: !!id,
      staleTime: 1000 * 60 * 5, // 5 minutes
    }
  )
}

export function useCreateBankAccount() {
  const queryClient = useQueryClient()
  return useApiMutation((data: BankAccountRequest) => getCommonService().createBankAccount(data), {
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['hrm', 'bank-accounts', 'list'],
      })
    },
  })
}

export function useUpdateBankAccount() {
  const queryClient = useQueryClient()
  return useApiMutation(
    ({ id, data }: { id: number; data: BankAccountRequest }) =>
      getCommonService().updateBankAccount(id, data),
    {
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.HRM.BANK_ACCOUNTS.DETAIL(variables.id),
        })
        queryClient.invalidateQueries({
          queryKey: ['hrm', 'bank-accounts', 'list'],
        })
      },
    }
  )
}

export function usePartialUpdateBankAccount() {
  const queryClient = useQueryClient()
  return useApiMutation(
    ({ id, data }: { id: number; data: PatchedBankAccountRequest }) =>
      getCommonService().partialUpdateBankAccount(id, data),
    {
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.HRM.BANK_ACCOUNTS.DETAIL(variables.id),
        })
        queryClient.invalidateQueries({
          queryKey: ['hrm', 'bank-accounts', 'list'],
        })
      },
    }
  )
}

export function useDeleteBankAccount() {
  const queryClient = useQueryClient()
  return useApiMutation((id: number) => getCommonService().deleteBankAccount(id), {
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['hrm', 'bank-accounts', 'list'],
      })
    },
  })
}

export function useBankAccountHistories(id: number, params?: HistoriesParams) {
  return useApiQuery(
    QUERY_KEYS.HRM.BANK_ACCOUNTS.HISTORIES(id, params || {}),
    () => getCommonService().getBankAccountHistories(id, params),
    {
      enabled: !!id,
      staleTime: 1000 * 60 * 5, // 5 minutes
    }
  )
}

// ===== NATIONALITIES =====
export function useNationalities(params?: GetNationalitiesParams) {
  return useApiQuery(
    QUERY_KEYS.HRM.NATIONALITIES.LIST(params || {}),
    () => getCommonService().getNationalities(params),
    {
      staleTime: 1000 * 60 * 10, // 10 minutes
    }
  )
}

export function useNationality(id: number) {
  return useApiQuery(
    QUERY_KEYS.HRM.NATIONALITIES.DETAIL(id),
    () => getCommonService().getNationality(id),
    {
      enabled: !!id,
      staleTime: 1000 * 60 * 10, // 10 minutes
    }
  )
}
