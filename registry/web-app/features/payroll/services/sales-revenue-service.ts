import { BaseApiService } from '@/api/base-service'
import { ApiPaths, components, paths } from '@/api/schema'
import { QUERY_KEYS } from '@/constants'
import { useApiMutation, useApiQuery } from '@/hooks/useApiQuery'
import type { HistoriesParams, ImportStartRequest } from '@/types/hrm-types'
import { useQueryClient } from '@tanstack/react-query'

// ===== TYPE DEFINITIONS =====
export type SalesRevenue = components['schemas']['SalesRevenue']
export type SalesRevenueRequest = components['schemas']['SalesRevenueRequest']
export type PatchedSalesRevenueRequest = components['schemas']['PatchedSalesRevenueRequest']
export type PaginatedSalesRevenueList = components['schemas']['PaginatedSalesRevenueList']

export type SalesRevenueReportListItem = components['schemas']['SalesRevenueReportListItem']
export type PaginatedSalesRevenueReportListItemList =
  components['schemas']['PaginatedSalesRevenueReportListItemList']
export type SalesRevenueReportChartResponse =
  components['schemas']['SalesRevenueReportChartResponse']

export type GetSalesRevenuesParams =
  paths['/api/payroll/sales-revenues/']['get']['parameters']['query']
export type GetSalesRevenueReportsParams =
  paths['/api/payroll/sales-revenue-reports/']['get']['parameters']['query']
export type GetSalesRevenueReportsChartParams =
  paths['/api/payroll/sales-revenue-reports/chart/']['get']['parameters']['query']

// ===== SERVICE CLASS =====
export class SalesRevenueService extends BaseApiService {
  /**
   * Get all sales revenues
   */
  async getSalesRevenues(params?: GetSalesRevenuesParams) {
    return await this.getPaginated(ApiPaths.payroll_sales_revenues_list, params)
  }

  /**
   * Create a new sales revenue
   */
  async createSalesRevenue(revenueData: SalesRevenueRequest) {
    return await this.post(ApiPaths.payroll_sales_revenues_create, revenueData)
  }

  /**
   * Get sales revenue by ID
   */
  async getSalesRevenue(id: number) {
    return await this.get(ApiPaths.payroll_sales_revenues_retrieve, {
      path: { id: id },
    })
  }

  /**
   * Update sales revenue
   */
  async updateSalesRevenue(id: number, revenueData: SalesRevenueRequest) {
    return await this.put(ApiPaths.payroll_sales_revenues_update, revenueData, { path: { id } })
  }

  /**
   * Partially update sales revenue
   */
  async partialUpdateSalesRevenue(id: number, revenueData: PatchedSalesRevenueRequest) {
    return await this.patch(ApiPaths.payroll_sales_revenues_partial_update, revenueData, {
      path: { id },
    })
  }

  /**
   * Delete sales revenue
   */
  async deleteSalesRevenue(id: number) {
    return await this.delete(ApiPaths.payroll_sales_revenues_destroy, { path: { id } })
  }

  /**
   * Export sales revenues to XLSX
   */
  async exportSalesRevenues(params?: {
    async?: boolean
    delivery?: 'link' | 'direct'
    fields?: string
    [key: string]: any
  }) {
    return await this.get(ApiPaths.payroll_sales_revenues_export_retrieve, { query: params })
  }

  /**
   * Get sales revenue histories
   */
  async getSalesRevenueHistories(id: number, params?: HistoriesParams) {
    return await this.get(ApiPaths.payroll_sales_revenues_histories_retrieve, {
      path: { id: String(id) },
      query: params,
    })
  }

  /**
   * Get sales revenue history detail
   */
  async getSalesRevenueHistory(id: number, logId: string) {
    return await this.get(ApiPaths.payroll_sales_revenues_history_retrieve, {
      path: { id: String(id), log_id: logId },
    })
  }

  /**
   * List sales revenue quality report
   */
  async listSalesRevenueReports(params?: GetSalesRevenueReportsParams) {
    return await this.getPaginated(ApiPaths.payroll_sales_revenue_reports_list, params)
  }

  /**
   * Get chart data for dashboard
   */
  async getSalesRevenueReportsChart(params?: GetSalesRevenueReportsChartParams) {
    return await this.get(ApiPaths.payroll_sales_revenue_reports_chart_retrieve, {
      query: params,
    })
  }

  /**
   * Export sales revenue reports to XLSX
   */
  async exportSalesRevenueReports(params?: {
    async?: boolean
    delivery?: 'link' | 'direct'
    [key: string]: any
  }) {
    return await this.get(ApiPaths.payroll_sales_revenue_reports_export_retrieve, {
      query: params,
    })
  }

  /**
   * Get sales revenue import template
   */
  async getSalesRevenueImportTemplate() {
    return await this.get(ApiPaths.payroll_sales_revenues_import_template_retrieve)
  }

  /**
   * Start sales revenue import job
   */
  async startSalesRevenueImport(data: ImportStartRequest) {
    return await this.post(ApiPaths.payroll_sales_revenues_import_create, data)
  }
}

// ===== SERVICE SINGLETON =====
let _salesRevenueService: SalesRevenueService | null = null

export function getSalesRevenueService(): SalesRevenueService {
  if (!_salesRevenueService) {
    _salesRevenueService = new SalesRevenueService()
  }
  return _salesRevenueService
}

// ===== REACT QUERY HOOKS =====
export function useSalesRevenues(params?: GetSalesRevenuesParams, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.PAYROLL.SALES_REVENUES.LIST(params || {}),
    () => getSalesRevenueService().getSalesRevenues(params),
    {
      staleTime: 1000 * 60 * 5, // 5 minutes
      ...options,
    }
  )
}

export function useSalesRevenue(id: number, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.PAYROLL.SALES_REVENUES.DETAIL(id),
    () => getSalesRevenueService().getSalesRevenue(id),
    {
      enabled: options?.enabled !== false && !!id,
      staleTime: 1000 * 60 * 5, // 5 minutes
    }
  )
}

export function useCreateSalesRevenue() {
  const queryClient = useQueryClient()
  return useApiMutation(
    (data: SalesRevenueRequest) => getSalesRevenueService().createSalesRevenue(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ['payroll', 'sales-revenues', 'list'],
        })
      },
    }
  )
}

export function useUpdateSalesRevenue() {
  const queryClient = useQueryClient()
  return useApiMutation(
    ({ id, data }: { id: number; data: SalesRevenueRequest }) =>
      getSalesRevenueService().updateSalesRevenue(id, data),
    {
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.PAYROLL.SALES_REVENUES.DETAIL(variables.id),
        })
        queryClient.invalidateQueries({
          queryKey: ['payroll', 'sales-revenues', 'list'],
        })
      },
    }
  )
}

export function usePartialUpdateSalesRevenue() {
  const queryClient = useQueryClient()
  return useApiMutation(
    ({ id, data }: { id: number; data: PatchedSalesRevenueRequest }) =>
      getSalesRevenueService().partialUpdateSalesRevenue(id, data),
    {
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.PAYROLL.SALES_REVENUES.DETAIL(variables.id),
        })
        queryClient.invalidateQueries({
          queryKey: ['payroll', 'sales-revenues', 'list'],
        })
      },
    }
  )
}

export function useDeleteSalesRevenue() {
  const queryClient = useQueryClient()
  return useApiMutation((id: number) => getSalesRevenueService().deleteSalesRevenue(id), {
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['payroll', 'sales-revenues', 'list'],
      })
    },
  })
}

export function useExportSalesRevenues() {
  return useApiMutation(
    (params?: {
      async?: boolean
      delivery?: 'link' | 'direct'
      fields?: string
      [key: string]: any
    }) => getSalesRevenueService().exportSalesRevenues(params)
  )
}

export function useSalesRevenueHistories(id: number, params?: HistoriesParams) {
  return useApiQuery(
    QUERY_KEYS.PAYROLL.SALES_REVENUES.HISTORIES(id, params || {}),
    () => getSalesRevenueService().getSalesRevenueHistories(id, params),
    {
      enabled: !!id,
      staleTime: 1000 * 60 * 5, // 5 minutes
    }
  )
}

export function useSalesRevenueHistory(id: number, logId: string, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.PAYROLL.SALES_REVENUES.HISTORY_DETAIL(id, logId),
    () => getSalesRevenueService().getSalesRevenueHistory(id, logId),
    {
      enabled: options?.enabled !== false && !!id && !!logId,
      staleTime: 1000 * 60 * 5, // 5 minutes
    }
  )
}

// ===== SALES REVENUE REPORTS HOOKS =====
export function useSalesRevenueReports(
  params?: GetSalesRevenueReportsParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.PAYROLL.SALES_REVENUE_REPORTS.LIST(params || {}),
    () => getSalesRevenueService().listSalesRevenueReports(params),
    {
      staleTime: 1000 * 60 * 5, // 5 minutes
      ...options,
    }
  )
}

export function useSalesRevenueReportsChart(
  params?: GetSalesRevenueReportsChartParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.PAYROLL.SALES_REVENUE_REPORTS.CHART(params || {}),
    () => getSalesRevenueService().getSalesRevenueReportsChart(params),
    {
      staleTime: 1000 * 60 * 5, // 5 minutes
      ...options,
    }
  )
}

export function useExportSalesRevenueReports() {
  return useApiMutation(
    (params?: { async?: boolean; delivery?: 'link' | 'direct'; [key: string]: any }) =>
      getSalesRevenueService().exportSalesRevenueReports(params)
  )
}

export function useSalesRevenueImportTemplate(options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.PAYROLL.SALES_REVENUES.IMPORT_TEMPLATE(),
    () => getSalesRevenueService().getSalesRevenueImportTemplate(),
    {
      staleTime: 1000 * 60 * 5, // 5 minutes
      enabled: options?.enabled ?? true,
    }
  )
}

export function useStartSalesRevenueImport() {
  const queryClient = useQueryClient()
  return useApiMutation(
    (data: ImportStartRequest) => getSalesRevenueService().startSalesRevenueImport(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ['payroll', 'sales-revenues', 'list'],
        })
      },
    }
  )
}
