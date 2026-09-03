import { BaseApiService } from '@/api/base-service'
import { ApiPaths, components, paths } from '@/api/schema'
import { QUERY_KEYS } from '@/constants'
import { useApiQuery } from '@/hooks/useApiQuery'

// ===== TYPE DEFINITIONS =====
export type EmployeeBankAccountList = components['schemas']['EmployeeBankAccountList']
export type PaginatedEmployeeBankAccountListList =
  components['schemas']['PaginatedEmployeeBankAccountListList']

export type GetEmployeeBankAccountsParams =
  paths['/api/hrm/employee-bank-accounts/']['get']['parameters']['query']
export type GetEmployeeBankAccountsExportParams =
  paths['/api/hrm/employee-bank-accounts/export/']['get']['parameters']['query']

// ===== SERVICE CLASS =====
export class EmployeeBankAccountService extends BaseApiService {
  /**
   * List all employee bank accounts (standalone, read-only — CR231)
   */
  async getEmployeeBankAccounts(params?: GetEmployeeBankAccountsParams) {
    return await this.getPaginated(ApiPaths.hrm_employee_bank_accounts_list, params)
  }

  /**
   * Get a single employee bank account by ID
   */
  async getEmployeeBankAccount(id: number) {
    return await this.get(ApiPaths.hrm_employee_bank_accounts_retrieve, {
      path: { id },
    })
  }

  /**
   * Export employee bank accounts to XLSX
   */
  async exportEmployeeBankAccounts(params?: GetEmployeeBankAccountsExportParams) {
    return await this.get(ApiPaths.hrm_employee_bank_accounts_export_retrieve, {
      query: params,
    })
  }
}

// ===== SERVICE SINGLETON =====
let _employeeBankAccountService: EmployeeBankAccountService | null = null

export function getEmployeeBankAccountService(): EmployeeBankAccountService {
  if (!_employeeBankAccountService) {
    _employeeBankAccountService = new EmployeeBankAccountService()
  }
  return _employeeBankAccountService
}

// ===== REACT QUERY HOOKS =====
export function useEmployeeBankAccounts(
  params?: GetEmployeeBankAccountsParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.HRM.EMPLOYEE_BANK_ACCOUNTS.LIST(params || {}),
    () => getEmployeeBankAccountService().getEmployeeBankAccounts(params),
    {
      staleTime: 1000 * 60 * 5,
      enabled: options?.enabled ?? true,
    }
  )
}

export function useEmployeeBankAccount(id: number, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.HRM.EMPLOYEE_BANK_ACCOUNTS.DETAIL(id),
    () => getEmployeeBankAccountService().getEmployeeBankAccount(id),
    {
      enabled: (options?.enabled ?? true) && !!id,
      staleTime: 1000 * 60 * 5,
    }
  )
}
