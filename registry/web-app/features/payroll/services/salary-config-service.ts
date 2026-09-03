import { BaseApiService } from '@/api/base-service'
import { ApiPaths, components } from '@/api/schema'
import { QUERY_KEYS } from '@/constants'
import { useApiQuery } from '@/hooks/useApiQuery'

// ===== TYPE DEFINITIONS =====
export type SalaryConfig = components['schemas']['SalaryConfig']
export type SalaryConfigSchema = components['schemas']['SalaryConfigSchema']

// ===== SERVICE CLASS =====
export class SalaryConfigService extends BaseApiService {
  /**
   * Get current salary configuration
   */
  async getSalaryConfigCurrent() {
    return await this.get(ApiPaths.payroll_salary_config_retrieve)
  }
}

// ===== SERVICE SINGLETON =====
let _salaryConfigService: SalaryConfigService | null = null

export function getSalaryConfigService(): SalaryConfigService {
  if (!_salaryConfigService) {
    _salaryConfigService = new SalaryConfigService()
  }
  return _salaryConfigService
}

// ===== REACT QUERY HOOKS =====
export function useSalaryConfigCurrent() {
  return useApiQuery(
    QUERY_KEYS.PAYROLL.SALARY_CONFIG.CURRENT(),
    () => getSalaryConfigService().getSalaryConfigCurrent(),
    { staleTime: 1000 * 60 * 30 } // 30 minutes
  )
}
