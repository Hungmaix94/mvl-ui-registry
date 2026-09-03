import { BaseApiService } from '@/api/base-service'
import { ApiPaths, components, paths } from '@/api/schema'
import { QUERY_KEYS } from '@/constants'
import { useApiMutation, useApiQuery, useInvalidateQueries } from '@/hooks/useApiQuery'
import type { HistoriesParams, ImportStartRequest } from '@/types/hrm-types'
import { ExportDelivery } from '@/constants/api-schema-aliases'

// ===== TYPE DEFINITIONS =====
export type RecruitmentExpense = components['schemas']['RecruitmentExpense']
export type RecruitmentExpenseRequest = components['schemas']['RecruitmentExpenseRequest']
export type PatchedRecruitmentExpenseRequest =
  components['schemas']['PatchedRecruitmentExpenseRequest']
export type PaginatedRecruitmentExpenseList =
  components['schemas']['PaginatedRecruitmentExpenseList']
export type RecruitmentExpenseMarkInvalidToZeroRequest =
  components['schemas']['RecruitmentExpenseMarkInvalidToZeroRequest']

export type GetRecruitmentExpensesParams =
  paths['/api/hrm/recruitment-expenses/']['get']['parameters']['query']
export type GetRecruitmentExpensesExportParams =
  paths['/api/hrm/recruitment-expenses/export/']['get']['parameters']['query']
export type GetRecruitmentExpenseImportTemplateParams =
  paths['/api/hrm/recruitment-expenses/import_template/']['get']['parameters']['query']

// ===== SERVICE CLASS =====
export class RecruitmentExpenseService extends BaseApiService {
  async getRecruitmentExpenses(params?: GetRecruitmentExpensesParams) {
    return await this.getPaginated(ApiPaths.hrm_recruitment_expenses_list, params)
  }

  async createRecruitmentExpense(expenseData: RecruitmentExpenseRequest) {
    return await this.post(ApiPaths.hrm_recruitment_expenses_create, expenseData)
  }

  async getRecruitmentExpense(id: number) {
    return await this.get(ApiPaths.hrm_recruitment_expenses_retrieve, {
      path: { id: id },
    })
  }

  async updateRecruitmentExpense(id: number, expenseData: RecruitmentExpenseRequest) {
    return await this.put(ApiPaths.hrm_recruitment_expenses_update, expenseData, { path: { id } })
  }

  async partialUpdateRecruitmentExpense(id: number, expenseData: PatchedRecruitmentExpenseRequest) {
    return await this.patch(ApiPaths.hrm_recruitment_expenses_partial_update, expenseData, {
      path: { id },
    })
  }

  async deleteRecruitmentExpense(id: number) {
    return await this.delete(ApiPaths.hrm_recruitment_expenses_destroy, { path: { id } })
  }

  async exportRecruitmentExpenses(params?: {
    async?: boolean
    delivery?: ExportDelivery
    fields?: string
    [key: string]: unknown
  }) {
    return await this.get(ApiPaths.hrm_recruitment_expenses_export_retrieve, {
      query: params,
    })
  }

  async getRecruitmentExpenseHistories(id: number, params?: HistoriesParams) {
    return await this.get(ApiPaths.hrm_recruitment_expenses_histories_retrieve, {
      path: { id: String(id) },
      query: params,
    })
  }

  async getRecruitmentExpenseImportTemplate(params?: GetRecruitmentExpenseImportTemplateParams) {
    return await this.get(ApiPaths.hrm_recruitment_expenses_import_template_retrieve, {
      query: params,
    })
  }

  async startRecruitmentExpenseImport(data: ImportStartRequest) {
    return await this.post(ApiPaths.hrm_recruitment_expenses_import_create, data)
  }

  async markRecruitmentExpensesInvalidToZero(data: RecruitmentExpenseMarkInvalidToZeroRequest) {
    return await this.post(ApiPaths.hrm_recruitment_expenses_mark_invalid_to_zero_create, data)
  }
}

// ===== SERVICE SINGLETON =====
let _recruitmentExpenseService: RecruitmentExpenseService | null = null

export function getRecruitmentExpenseService(): RecruitmentExpenseService {
  if (!_recruitmentExpenseService) {
    _recruitmentExpenseService = new RecruitmentExpenseService()
  }
  return _recruitmentExpenseService
}

// ===== REACT QUERY HOOKS =====
export function useRecruitmentExpenses(
  params?: GetRecruitmentExpensesParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.HRM.RECRUITMENT_EXPENSES.LIST(params || {}),
    () => getRecruitmentExpenseService().getRecruitmentExpenses(params),
    {
      staleTime: 1000 * 60 * 5, // 5 minutes
      enabled: options?.enabled ?? true,
    }
  )
}

export function useRecruitmentExpense(id: number) {
  return useApiQuery(
    QUERY_KEYS.HRM.RECRUITMENT_EXPENSES.DETAIL(id),
    () => getRecruitmentExpenseService().getRecruitmentExpense(id),
    {
      enabled: !!id,
      staleTime: 1000 * 60 * 5, // 5 minutes
    }
  )
}

export function useCreateRecruitmentExpense() {
  return useApiMutation((data: RecruitmentExpenseRequest) =>
    getRecruitmentExpenseService().createRecruitmentExpense(data)
  )
}

export function useUpdateRecruitmentExpense() {
  return useApiMutation(({ id, data }: { id: number; data: RecruitmentExpenseRequest }) =>
    getRecruitmentExpenseService().updateRecruitmentExpense(id, data)
  )
}

export function usePartialUpdateRecruitmentExpense() {
  return useApiMutation(({ id, data }: { id: number; data: PatchedRecruitmentExpenseRequest }) =>
    getRecruitmentExpenseService().partialUpdateRecruitmentExpense(id, data)
  )
}

export function useDeleteRecruitmentExpense() {
  return useApiMutation((id: number) => getRecruitmentExpenseService().deleteRecruitmentExpense(id))
}

export function useExportRecruitmentExpenses() {
  return useApiMutation(
    (params?: { async?: boolean; delivery?: ExportDelivery; fields?: string }) =>
      getRecruitmentExpenseService().exportRecruitmentExpenses(params)
  )
}

export function useRecruitmentExpenseImportTemplate(
  params?: GetRecruitmentExpenseImportTemplateParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.HRM.RECRUITMENT_EXPENSES.IMPORT_TEMPLATE(),
    () => getRecruitmentExpenseService().getRecruitmentExpenseImportTemplate(params),
    {
      staleTime: 1000 * 60 * 5, // 5 minutes
      enabled: options?.enabled ?? true,
    }
  )
}

export function useStartRecruitmentExpenseImport() {
  const { invalidateByPrefix } = useInvalidateQueries()
  return useApiMutation(
    (data: ImportStartRequest) =>
      getRecruitmentExpenseService().startRecruitmentExpenseImport(data),
    {
      onSuccess: () => {
        invalidateByPrefix('hrm')
      },
    }
  )
}

export function useMarkRecruitmentExpensesInvalidToZero() {
  const { invalidateByPrefix } = useInvalidateQueries()
  return useApiMutation(
    (data: RecruitmentExpenseMarkInvalidToZeroRequest) =>
      getRecruitmentExpenseService().markRecruitmentExpensesInvalidToZero(data),
    {
      onSuccess: () => {
        invalidateByPrefix('hrm')
      },
    }
  )
}
