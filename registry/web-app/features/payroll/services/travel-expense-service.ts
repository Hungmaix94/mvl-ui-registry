import { BaseApiService } from '@/api/base-service'
import { ApiPaths, components, paths } from '@/api/schema'
import { QUERY_KEYS } from '@/constants'
import { useApiMutation, useApiQuery } from '@/hooks/useApiQuery'
import type { HistoriesParams, ImportStartRequest } from '@/types/hrm-types'
import { useQueryClient } from '@tanstack/react-query'

// ===== TYPE DEFINITIONS =====
export type TravelExpense = components['schemas']['TravelExpense']
export type TravelExpenseRequest = components['schemas']['TravelExpenseRequest']
export type PatchedTravelExpenseRequest = components['schemas']['PatchedTravelExpenseRequest']
export type PaginatedTravelExpenseList = components['schemas']['PaginatedTravelExpenseList']

export type GetTravelExpensesParams =
  paths['/api/payroll/travel-expenses/']['get']['parameters']['query']

// ===== SERVICE CLASS =====
export class TravelExpenseService extends BaseApiService {
  /**
   * Get all travel expenses
   */
  async getTravelExpenses(params?: GetTravelExpensesParams) {
    return await this.getPaginated(ApiPaths.payroll_travel_expenses_list, params)
  }

  /**
   * Create a new travel expense
   */
  async createTravelExpense(expenseData: TravelExpenseRequest) {
    return await this.post(ApiPaths.payroll_travel_expenses_create, expenseData)
  }

  /**
   * Get travel expense by ID
   */
  async getTravelExpense(id: number) {
    return await this.get(ApiPaths.payroll_travel_expenses_retrieve, {
      path: { id: id },
    })
  }

  /**
   * Update travel expense
   */
  async updateTravelExpense(id: number, expenseData: TravelExpenseRequest) {
    return await this.put(ApiPaths.payroll_travel_expenses_update, expenseData, { path: { id } })
  }

  /**
   * Partially update travel expense
   */
  async partialUpdateTravelExpense(id: number, expenseData: PatchedTravelExpenseRequest) {
    return await this.patch(ApiPaths.payroll_travel_expenses_partial_update, expenseData, {
      path: { id },
    })
  }

  /**
   * Delete travel expense
   */
  async deleteTravelExpense(id: number) {
    return await this.delete(ApiPaths.payroll_travel_expenses_destroy, { path: { id } })
  }

  /**
   * Export travel expenses to XLSX
   */
  async exportTravelExpenses(params?: {
    async?: boolean
    delivery?: 'link' | 'direct'
    fields?: string
    [key: string]: any
  }) {
    return await this.get(ApiPaths.payroll_travel_expenses_export_retrieve, { query: params })
  }

  /**
   * Get travel expense histories
   */
  async getTravelExpenseHistories(id: number, params?: HistoriesParams) {
    return await this.get(ApiPaths.payroll_travel_expenses_histories_retrieve, {
      path: { id: String(id) },
      query: params,
    })
  }

  /**
   * Get travel expense history detail
   */
  async getTravelExpenseHistory(id: number, logId: string) {
    return await this.get(ApiPaths.payroll_travel_expenses_history_retrieve, {
      path: { id: String(id), log_id: logId },
    })
  }

  /**
   * Get travel expense import template
   */
  async getTravelExpenseImportTemplate() {
    return await this.get(ApiPaths.payroll_travel_expenses_import_template_retrieve)
  }

  /**
   * Start travel expense import job
   */
  async startTravelExpenseImport(data: ImportStartRequest) {
    return await this.post(ApiPaths.payroll_travel_expenses_import_create, data)
  }
}

// ===== SERVICE SINGLETON =====
let _travelExpenseService: TravelExpenseService | null = null

export function getTravelExpenseService(): TravelExpenseService {
  if (!_travelExpenseService) {
    _travelExpenseService = new TravelExpenseService()
  }
  return _travelExpenseService
}

// ===== REACT QUERY HOOKS =====
export function useTravelExpenses(
  params?: GetTravelExpensesParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.PAYROLL.TRAVEL_EXPENSES.LIST(params || {}),
    () => getTravelExpenseService().getTravelExpenses(params),
    {
      staleTime: 1000 * 60 * 5, // 5 minutes
      ...options,
    }
  )
}

export function useTravelExpense(id: number, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.PAYROLL.TRAVEL_EXPENSES.DETAIL(id),
    () => getTravelExpenseService().getTravelExpense(id),
    {
      enabled: options?.enabled !== false && !!id,
      staleTime: 1000 * 60 * 5, // 5 minutes
    }
  )
}

export function useCreateTravelExpense() {
  const queryClient = useQueryClient()
  return useApiMutation(
    (data: TravelExpenseRequest) => getTravelExpenseService().createTravelExpense(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ['payroll', 'travel-expenses', 'list'],
        })
      },
    }
  )
}

export function useUpdateTravelExpense() {
  const queryClient = useQueryClient()
  return useApiMutation(
    ({ id, data }: { id: number; data: TravelExpenseRequest }) =>
      getTravelExpenseService().updateTravelExpense(id, data),
    {
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.PAYROLL.TRAVEL_EXPENSES.DETAIL(variables.id),
        })
        queryClient.invalidateQueries({
          queryKey: ['payroll', 'travel-expenses', 'list'],
        })
      },
    }
  )
}

export function usePartialUpdateTravelExpense() {
  const queryClient = useQueryClient()
  return useApiMutation(
    ({ id, data }: { id: number; data: PatchedTravelExpenseRequest }) =>
      getTravelExpenseService().partialUpdateTravelExpense(id, data),
    {
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.PAYROLL.TRAVEL_EXPENSES.DETAIL(variables.id),
        })
        queryClient.invalidateQueries({
          queryKey: ['payroll', 'travel-expenses', 'list'],
        })
      },
    }
  )
}

export function useDeleteTravelExpense() {
  return useApiMutation(
    (id: number) => {
      return getTravelExpenseService().deleteTravelExpense(id)
    },
    {
      retry: false, // Disable retry for delete operations
      onSuccess: () => {
        // Don't invalidate here - let useTravelExpenseDelete handle it
        // This prevents double invalidation and potential re-render issues
      },
    }
  )
}

export function useExportTravelExpenses() {
  return useApiMutation(
    (params?: {
      async?: boolean
      delivery?: 'link' | 'direct'
      fields?: string
      [key: string]: any
    }) => getTravelExpenseService().exportTravelExpenses(params)
  )
}

export function useTravelExpenseHistories(id: number, params?: HistoriesParams) {
  return useApiQuery(
    QUERY_KEYS.PAYROLL.TRAVEL_EXPENSES.HISTORIES(id, params || {}),
    () => getTravelExpenseService().getTravelExpenseHistories(id, params),
    {
      enabled: !!id,
      staleTime: 1000 * 60 * 5, // 5 minutes
    }
  )
}

export function useTravelExpenseHistory(
  id: number,
  logId: string,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.PAYROLL.TRAVEL_EXPENSES.HISTORY_DETAIL(id, logId),
    () => getTravelExpenseService().getTravelExpenseHistory(id, logId),
    {
      enabled: options?.enabled !== false && !!id && !!logId,
      staleTime: 1000 * 60 * 5, // 5 minutes
    }
  )
}

export function useTravelExpenseImportTemplate(options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.PAYROLL.TRAVEL_EXPENSES.IMPORT_TEMPLATE(),
    () => getTravelExpenseService().getTravelExpenseImportTemplate(),
    {
      staleTime: 1000 * 60 * 5, // 5 minutes
      enabled: options?.enabled ?? true,
    }
  )
}

export function useStartTravelExpenseImport() {
  const queryClient = useQueryClient()
  return useApiMutation(
    (data: ImportStartRequest) => getTravelExpenseService().startTravelExpenseImport(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ['payroll', 'travel-expenses', 'list'],
        })
      },
    }
  )
}
