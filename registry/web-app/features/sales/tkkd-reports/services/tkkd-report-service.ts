import { BaseApiService } from '@/api/base-service'
import { ApiPaths, components, operations } from '@/api/schema'
import { QUERY_KEYS } from '@/constants'
import { useApiQuery } from '@/hooks/useApiQuery'

export type TkkdRevenueGoodsResponse = components['schemas']['TkkdRevenueGoodsReconResponse']
export type TkkdRevenueGoodsRow = components['schemas']['TkkdRevenueGoodsReconRow']
export type TkkdRevenueGoodsTotal = components['schemas']['TkkdRevenueGoodsReconTotal']
export type TkkdMatrixResponse = components['schemas']['TkkdMatrixResponse']

export type TkkdDealsForUnitResponse = components['schemas']['TkkdDealsForUnitResponse']
export type TkkdDealsForUnitRow = components['schemas']['TkkdDealsForUnitRow']
export type TkkdDealsForUnitSummary = components['schemas']['TkkdDealsForUnitSummary']
export type TkkdUnrecognizedLine = components['schemas']['TkkdUnrecognizedLine']

// Params shared by the 5 TKKD reports, taken straight from the generated schema:
// period (year+month in month mode, `week` in week mode) + sign-date range +
// org-chart (branch/block/department). All keys are optional in the contract because
// which period keys are required depends on `period_type` (task 86euvmaba).
export type TkkdRevenueGoodsParams = Partial<
  NonNullable<operations['sales_reports_revenue_goods_by_project_retrieve']['parameters']['query']>
> & {
  period_type?: string
  week?: string
  block?: number
  branch?: number
  department?: number
  contract_date_from?: string
  contract_date_to?: string
}

export type TkkdDealsForUnitParams =
  operations['sales_reports_revenue_goods_by_project_deals_retrieve']['parameters']['query']

class TkkdReportService extends BaseApiService {
  async getRevenueGoodsByProject(params: TkkdRevenueGoodsParams) {
    return await this.get(ApiPaths.sales_reports_revenue_goods_by_project_retrieve, {
      query: params,
    })
  }

  async getRevenueGoodsByBranch(params: TkkdRevenueGoodsParams) {
    return await this.get(ApiPaths.sales_reports_revenue_goods_by_branch_retrieve, {
      query: params,
    })
  }

  async getRevenueGoodsByBlock(params: TkkdRevenueGoodsParams) {
    return await this.get(ApiPaths.sales_reports_revenue_goods_by_block_retrieve, {
      query: params,
    })
  }

  async getRevenueGoodsByDepartment(params: TkkdRevenueGoodsParams) {
    return await this.get(ApiPaths.sales_reports_revenue_goods_by_department_retrieve, {
      query: params,
    })
  }

  async getProjectBlockMatrix(params: TkkdRevenueGoodsParams) {
    return await this.get(ApiPaths.sales_reports_project_block_matrix_retrieve, {
      query: params,
    })
  }

  async getRevenueGoodsByProjectDeals(params: TkkdDealsForUnitParams) {
    return await this.get(ApiPaths.sales_reports_revenue_goods_by_project_deals_retrieve, {
      query: params,
    })
  }

  async getRevenueGoodsByBranchDeals(params: TkkdDealsForUnitParams) {
    return await this.get(ApiPaths.sales_reports_revenue_goods_by_branch_deals_retrieve, {
      query: params,
    })
  }

  async getRevenueGoodsByBlockDeals(params: TkkdDealsForUnitParams) {
    return await this.get(ApiPaths.sales_reports_revenue_goods_by_block_deals_retrieve, {
      query: params,
    })
  }

  async getRevenueGoodsByDepartmentDeals(params: TkkdDealsForUnitParams) {
    return await this.get(ApiPaths.sales_reports_revenue_goods_by_department_deals_retrieve, {
      query: params,
    })
  }

  private async downloadXlsx(
    path: ApiPaths,
    query: Record<string, unknown>,
    filename: string
  ): Promise<void> {
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

  async exportRevenueGoodsByProject(
    params: TkkdRevenueGoodsParams,
    filename = 'tkkd-revenue-goods-by-project.xlsx'
  ): Promise<void> {
    await this.downloadXlsx(
      ApiPaths.sales_reports_revenue_goods_by_project_retrieve,
      { ...params, export: 'xlsx' },
      filename
    )
  }

  async exportRevenueGoodsByBranch(
    params: TkkdRevenueGoodsParams,
    filename = 'tkkd-revenue-goods-by-branch.xlsx'
  ): Promise<void> {
    await this.downloadXlsx(
      ApiPaths.sales_reports_revenue_goods_by_branch_retrieve,
      { ...params, export: 'xlsx' },
      filename
    )
  }

  async exportRevenueGoodsByBlock(
    params: TkkdRevenueGoodsParams,
    filename = 'tkkd-revenue-goods-by-block.xlsx'
  ): Promise<void> {
    await this.downloadXlsx(
      ApiPaths.sales_reports_revenue_goods_by_block_retrieve,
      { ...params, export: 'xlsx' },
      filename
    )
  }

  async exportRevenueGoodsByDepartment(
    params: TkkdRevenueGoodsParams,
    filename = 'tkkd-revenue-goods-by-department.xlsx'
  ): Promise<void> {
    await this.downloadXlsx(
      ApiPaths.sales_reports_revenue_goods_by_department_retrieve,
      { ...params, export: 'xlsx' },
      filename
    )
  }

  async exportProjectBlockMatrix(
    params: TkkdRevenueGoodsParams,
    filename = 'tkkd-project-block-matrix.xlsx'
  ): Promise<void> {
    await this.downloadXlsx(
      ApiPaths.sales_reports_project_block_matrix_retrieve,
      { ...params, export: 'xlsx' },
      filename
    )
  }
}

let _service: TkkdReportService | null = null

export function getTkkdReportService(): TkkdReportService {
  if (!_service) _service = new TkkdReportService()
  return _service
}

// The hooks below gate on `!!params` only. `buildTkkdReportParams` already returns
// `undefined` unless the period is complete — year+month in month mode, `week` in week
// mode — so gating on `year`/`month` here would silently disable every query in week
// mode (task 86euvmaba).
export function useTkkdRevenueGoodsByProject(
  params: TkkdRevenueGoodsParams | undefined,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.SALES.TKKD_REPORTS.BY_PROJECT(params ?? {}),
    () => getTkkdReportService().getRevenueGoodsByProject(params!),
    { enabled: (options?.enabled ?? true) && !!params }
  )
}

export function useTkkdRevenueGoodsByBranch(
  params: TkkdRevenueGoodsParams | undefined,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.SALES.TKKD_REPORTS.BY_BRANCH(params ?? {}),
    () => getTkkdReportService().getRevenueGoodsByBranch(params!),
    { enabled: (options?.enabled ?? true) && !!params }
  )
}

export function useTkkdRevenueGoodsByBlock(
  params: TkkdRevenueGoodsParams | undefined,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.SALES.TKKD_REPORTS.BY_BLOCK(params ?? {}),
    () => getTkkdReportService().getRevenueGoodsByBlock(params!),
    { enabled: (options?.enabled ?? true) && !!params }
  )
}

export function useTkkdRevenueGoodsByDepartment(
  params: TkkdRevenueGoodsParams | undefined,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.SALES.TKKD_REPORTS.BY_DEPARTMENT(params ?? {}),
    () => getTkkdReportService().getRevenueGoodsByDepartment(params!),
    { enabled: (options?.enabled ?? true) && !!params }
  )
}

export function useTkkdProjectBlockMatrix(
  params: TkkdRevenueGoodsParams | undefined,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.SALES.TKKD_REPORTS.PROJECT_BLOCK_MATRIX(params ?? {}),
    () => getTkkdReportService().getProjectBlockMatrix(params!),
    { enabled: (options?.enabled ?? true) && !!params }
  )
}
