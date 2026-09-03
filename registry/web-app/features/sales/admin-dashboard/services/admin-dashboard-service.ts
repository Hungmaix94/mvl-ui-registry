import { BaseApiService } from '@/api/base-service'
import { ApiPaths, components, paths } from '@/api/schema'
import { QUERY_KEYS } from '@/constants'
import { useApiQuery } from '@/hooks/useApiQuery'

// ── Response types ──────────────────────────────────────────────────────────
export type AdminDashboardSummary = components['schemas']['AdminDashboardSummary']
export type AdminDashboardPerformance = components['schemas']['AdminDashboardPerformance']
export type AdminDashboardRevenueTrend = components['schemas']['AdminDashboardRevenueTrend']
export type AdminDashboardTransactionByProject =
  components['schemas']['AdminDashboardTransactionByProject']
export type AdminDashboardPendingRecon = components['schemas']['AdminDashboardPendingRecon']

// ── Query param types ─────────────────────────────────────────────────────────
export type GetAdminDashboardSummaryParams =
  paths['/api/sales/admin-dashboard/summary/']['get']['parameters']['query']
export type GetAdminDashboardPerformanceParams =
  paths['/api/sales/admin-dashboard/performance/']['get']['parameters']['query']
export type GetAdminDashboardRevenueTrendParams =
  paths['/api/sales/admin-dashboard/revenue-trend/']['get']['parameters']['query']
export type GetAdminDashboardTransactionsByProjectParams =
  paths['/api/sales/admin-dashboard/transactions-by-project/']['get']['parameters']['query']
export type GetAdminDashboardPendingReconciliationsParams =
  paths['/api/sales/admin-dashboard/pending-reconciliations/']['get']['parameters']['query']
export type ExportAdminDashboardPerformanceParams =
  paths['/api/sales/admin-dashboard/export-performance/']['get']['parameters']['query']
export type ExportAdminDashboardTransactionsByProjectParams =
  paths['/api/sales/admin-dashboard/export-transactions-by-project/']['get']['parameters']['query']
export type ExportAdminDashboardRevenueTrendParams =
  paths['/api/sales/admin-dashboard/export-revenue-trend/']['get']['parameters']['query']

class AdminDashboardService extends BaseApiService {
  async getSummary(params?: GetAdminDashboardSummaryParams) {
    return await this.get(ApiPaths.sales_admin_dashboard_summary_retrieve, { query: params })
  }

  async getPerformance(params?: GetAdminDashboardPerformanceParams) {
    return await this.get(ApiPaths.sales_admin_dashboard_performance_retrieve, { query: params })
  }

  async getRevenueTrend(params?: GetAdminDashboardRevenueTrendParams) {
    return await this.get(ApiPaths.sales_admin_dashboard_revenue_trend_retrieve, { query: params })
  }

  async getTransactionsByProject(params?: GetAdminDashboardTransactionsByProjectParams) {
    return await this.get(ApiPaths.sales_admin_dashboard_transactions_by_project_retrieve, {
      query: params,
    })
  }

  async getPendingReconciliations(params?: GetAdminDashboardPendingReconciliationsParams) {
    return await this.get(ApiPaths.sales_admin_dashboard_pending_reconciliations_retrieve, {
      query: params,
    })
  }

  /** openapi-fetch cannot infer binary-only (xlsx) responses — narrow cast, same as other export services */
  private async downloadXlsx(
    path: ApiPaths,
    query: Record<string, unknown> | undefined,
    filename: string
  ): Promise<void> {
    // openapi-fetch's typed overloads collapse to `never` for a runtime ApiPaths union; base-service
    // casts the path the same way. Binary (xlsx) responses also need the narrow result cast below.
    const response = (await (this.client.GET as never as (path: string, init: unknown) => unknown)(
      path,
      { params: { query }, parseAs: 'blob' }
    )) as { data?: Blob; error?: unknown }

    if (response.error) throw response.error

    const blob = response.data as Blob
    const url = window.URL.createObjectURL(new Blob([blob]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }

  async exportPerformance(params?: ExportAdminDashboardPerformanceParams): Promise<void> {
    await this.downloadXlsx(
      ApiPaths.sales_admin_dashboard_export_performance_retrieve,
      params,
      'sales-admin-performance.xlsx'
    )
  }

  async exportTransactionsByProject(
    params?: ExportAdminDashboardTransactionsByProjectParams
  ): Promise<void> {
    await this.downloadXlsx(
      ApiPaths.sales_admin_dashboard_export_transactions_by_project_retrieve,
      params,
      'sales-admin-transactions-by-project.xlsx'
    )
  }

  /** filename varies by `group` (thang/tuan/nam) — caller passes it, same as the backend's own `Content-Disposition` suffix. */
  async exportRevenueTrend(
    params: ExportAdminDashboardRevenueTrendParams | undefined,
    filename: string
  ): Promise<void> {
    await this.downloadXlsx(
      ApiPaths.sales_admin_dashboard_export_revenue_trend_retrieve,
      params,
      filename
    )
  }
}

let _service: AdminDashboardService | null = null

export function getAdminDashboardService(): AdminDashboardService {
  if (!_service) _service = new AdminDashboardService()
  return _service
}

// ── Query hooks ───────────────────────────────────────────────────────────────
export function useAdminDashboardSummary(
  params?: GetAdminDashboardSummaryParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.SALES.ADMIN_DASHBOARD.SUMMARY(params ?? {}),
    () => getAdminDashboardService().getSummary(params),
    { enabled: options?.enabled ?? true, staleTime: 1000 * 60 * 5 }
  )
}

export function useAdminDashboardPerformance(
  params?: GetAdminDashboardPerformanceParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.SALES.ADMIN_DASHBOARD.PERFORMANCE(params ?? {}),
    () => getAdminDashboardService().getPerformance(params),
    { enabled: options?.enabled ?? true, staleTime: 1000 * 60 * 5 }
  )
}

/**
 * Toàn bộ dòng của bộ lọc trong MỘT request, không phân trang.
 *
 * Khối dashboard "Hiệu suất theo tổ chức" là biểu đồ xếp hạng nên không được cắt trang: tổ
 * chức đứng đầu hoàn toàn có thể nằm ở trang 2, và người mở dashboard đọc trang 1 như thể đó
 * là toàn bộ bảng xếp hạng. `page_size=0` là tham số BE mở cho đúng nhu cầu này (PR #3368);
 * cùng hợp đồng với `useAdminDashboardAllTransactionsByProject`.
 */
export function useAdminDashboardAllPerformance(
  params?: Omit<GetAdminDashboardPerformanceParams, 'page' | 'page_size'>,
  options?: { enabled?: boolean }
) {
  const query: GetAdminDashboardPerformanceParams = { ...params, page_size: 0 }
  return useApiQuery(
    QUERY_KEYS.SALES.ADMIN_DASHBOARD.PERFORMANCE(query),
    () => getAdminDashboardService().getPerformance(query),
    { enabled: options?.enabled ?? true, staleTime: 1000 * 60 * 5 }
  )
}

export function useAdminDashboardRevenueTrend(
  params?: GetAdminDashboardRevenueTrendParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.SALES.ADMIN_DASHBOARD.REVENUE_TREND(params ?? {}),
    () => getAdminDashboardService().getRevenueTrend(params),
    { enabled: options?.enabled ?? true, staleTime: 1000 * 60 * 5 }
  )
}

export function useAdminDashboardTransactionsByProject(
  params?: GetAdminDashboardTransactionsByProjectParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.SALES.ADMIN_DASHBOARD.TRANSACTIONS_BY_PROJECT(params ?? {}),
    () => getAdminDashboardService().getTransactionsByProject(params),
    { enabled: options?.enabled ?? true, staleTime: 1000 * 60 * 5 }
  )
}

/**
 * Toàn bộ dự án của bộ lọc trong MỘT request.
 *
 * Khối dashboard "Giao dịch theo dự án" là biểu đồ xếp hạng nên không được cắt trang: xếp
 * hạng trên một trang là xếp hạng SAI — dự án lớn nhất hoàn toàn có thể nằm ở trang 2.
 * `page_size=0` là tham số BE mở riêng cho đúng nhu cầu đó (PR #3365); trước khi có nó FE
 * phải tự gọi vòng từng trang rồi ghép, và **đừng quay lại cách ấy**.
 */
export function useAdminDashboardAllTransactionsByProject(
  params?: Omit<GetAdminDashboardTransactionsByProjectParams, 'page' | 'page_size'>,
  options?: { enabled?: boolean }
) {
  const query: GetAdminDashboardTransactionsByProjectParams = { ...params, page_size: 0 }
  return useApiQuery(
    QUERY_KEYS.SALES.ADMIN_DASHBOARD.TRANSACTIONS_BY_PROJECT(query),
    () => getAdminDashboardService().getTransactionsByProject(query),
    { enabled: options?.enabled ?? true, staleTime: 1000 * 60 * 5 }
  )
}

export function useAdminDashboardPendingReconciliations(
  params?: GetAdminDashboardPendingReconciliationsParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.SALES.ADMIN_DASHBOARD.PENDING_RECONCILIATIONS(params ?? {}),
    () => getAdminDashboardService().getPendingReconciliations(params),
    { enabled: options?.enabled ?? true, staleTime: 1000 * 60 * 5 }
  )
}
