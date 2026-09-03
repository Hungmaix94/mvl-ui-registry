import { BaseApiService } from '@/api/base-service'
import { ApiPaths, components, paths } from '@/api/schema.ts'
import { QUERY_KEYS } from '@/constants'
import { useApiQuery, useApiMutation } from '@/hooks/useApiQuery'
import type { HistoriesParams } from '@/types/hrm-types'
import { useExport } from '@/hooks/useExport.tsx'
import { useCallback } from 'react'
import { ExportDelivery } from '@/constants/api-schema-aliases'

// Type definitions from generated schema
export type Project = components['schemas']['Project']
export type ProjectRequest = components['schemas']['ProjectRequest']
export type PatchedProjectRequest = components['schemas']['PatchedProjectRequest']
export type PaginatedProjectList = components['schemas']['PaginatedProjectList']

export type ProjectDropdown = components['schemas']['ProjectDropdown']
export type ProjectStaff = components['schemas']['ProjectStaff']
export type ProjectStaffRequest = components['schemas']['ProjectStaffRequest']
export type PatchedProjectStaffRequest = components['schemas']['PatchedProjectStaffRequest']
export type PaginatedProjectDropdownList = components['schemas']['PaginatedProjectDropdownList']

export type Investor = components['schemas']['Investor']
export type InvestorRequest = components['schemas']['InvestorRequest']
export type PatchedInvestorRequest = components['schemas']['PatchedInvestorRequest']
export type InvestorDropdown = components['schemas']['InvestorDropdown']
export type PaginatedInvestorList = components['schemas']['PaginatedInvestorList']
export type PaginatedInvestorDropdownList = components['schemas']['PaginatedInvestorDropdownList']

export type Exchange = components['schemas']['SaleExchange']
export type ExchangeRequest = components['schemas']['SaleExchangeRequest']
export type PatchedExchangeRequest = components['schemas']['PatchedSaleExchangeRequest']
export type ExchangeDropdown = components['schemas']['ExchangeDropdown']
export type PaginatedExchangeList = components['schemas']['PaginatedSaleExchangeList']
export type PaginatedExchangeDropdownList = components['schemas']['PaginatedExchangeDropdownList']

export type ProductInventory = components['schemas']['ProductInventory']
export type ProductInventoryRequest = components['schemas']['ProductInventoryRequest']
export type PatchedProductInventoryRequest = components['schemas']['PatchedProductInventoryRequest']
export type ProductInventoryDropdown = components['schemas']['ProductInventoryDropdown']
export type PaginatedProductInventoryList = components['schemas']['PaginatedProductInventoryList']
export type PaginatedProductInventoryDropdownList =
  components['schemas']['PaginatedProductInventoryDropdownList']

export type SalesAllocation = components['schemas']['SalesAllocation']
export type SalesAllocationRequest = components['schemas']['SalesAllocationRequest']
export type PatchedSalesAllocationRequest = components['schemas']['PatchedSalesAllocationRequest']
export type SalesAllocationDropdown = components['schemas']['SalesAllocationDropdown']
export type PaginatedSalesAllocationList = components['schemas']['PaginatedSalesAllocationList']
export type PaginatedSalesAllocationDropdownList =
  components['schemas']['PaginatedSalesAllocationDropdownList']
export type SalesAllocationImportStartRequest = components['schemas']['ImportStartRequest']

export type SACommissionWorkspaceRaw = components['schemas']['SACoreCommissionWorkspace']

export type CommissionPeriodEntry = {
  id: number
  effective_from: string | null
  effective_to: string | null
  note: string | null
  period_status: string
  is_current: boolean
  can_edit: boolean
  can_delete: boolean
  /**
   * Cấu hình ĐÃ DUYỆT có gỡ về nháp để sửa lại được không. `false` khi: chưa từng
   * duyệt (không có gì để gỡ), kế thừa từ Bảng hàng (thao tác ở màn SA), hoặc đã
   * có giao dịch còn hiệu lực dùng tới (lúc đó phải tạo kỳ mới).
   * TODO(schema): field BE mới bổ sung, chưa có trong schema generated.
   */
  can_reopen?: boolean
  recommended_action?: string
  lock_reason?: string
  /** Nguồn cấu hình kỳ này: 'sales_allocation' (kế thừa từ SA) | 'product_inventory' (riêng của căn). */
  edit_scope?: string
  pct_ceo?: number | null
  amt_ceo?: number | null
  pct_ceo_mv_paid?: number | null
  amt_ceo_mv_paid?: number | null
  pct_sales_director?: number | null
  amt_sales_director?: number | null
  pct_sales_manager?: number | null
  amt_sales_manager?: number | null
  pct_project_director?: number | null
  amt_project_director?: number | null
  pct_project_secretary?: number | null
  amt_project_secretary?: number | null
  [key: string]: any // To allow dynamic fields like pct_agency_fee, amt_f1, etc.
}

export type SACommissionWorkspace = Omit<
  SACommissionWorkspaceRaw,
  'periods' | 'current' | 'readiness'
> & {
  periods: {
    management: CommissionPeriodEntry[]
    promotion: CommissionPeriodEntry[]
    core: CommissionPeriodEntry[]
    f2: CommissionPeriodEntry[]
  }
  current: {
    management: CommissionPeriodEntry | null
    promotion: CommissionPeriodEntry | null
    core: CommissionPeriodEntry | null
    f2: CommissionPeriodEntry | null
  }
  readiness: {
    is_ready: boolean
    issues: string[]
  }
}
export type PeriodStatus = 'fallback' | 'scheduled' | 'active' | 'expired'
export type RecommendedAction =
  | 'edit'
  | 'reopen'
  | 'clone_new_period'
  | 'historical_correction'
  | 'manage_at_sales_allocation'

export function parseCommissionLockError(error: unknown): {
  recommended_action?: RecommendedAction
  downstream_deal_count?: number
  lock_reason?: string
} {
  const anyError = error as any
  const errors = Array.isArray(anyError?.errors) ? anyError.errors : [anyError]

  for (const err of errors) {
    if (err?.meta?.recommended_action) {
      return {
        recommended_action: err.meta.recommended_action as RecommendedAction,
        downstream_deal_count: err.meta.downstream_deal_count,
        lock_reason: err.detail || err.message,
      }
    }
  }

  return {}
}

// Request parameter types
export type GetProjectsParams = paths['/api/realestate/projects/']['get']['parameters']['query']
export type GetProjectsExportParams =
  paths['/api/realestate/projects/export/']['get']['parameters']['query']

export type GetProjectsDropdownParams =
  paths['/api/realestate/projects/dropdown/']['get']['parameters']['query']

export type GetInvestorsParams = paths['/api/realestate/investors/']['get']['parameters']['query']
export type GetInvestorsDropdownParams =
  paths['/api/realestate/investors/dropdown/']['get']['parameters']['query']

export type GetExchangesParams = paths['/api/realestate/exchanges/']['get']['parameters']['query']
export type GetExchangesDropdownParams =
  paths['/api/realestate/exchanges/dropdown/']['get']['parameters']['query']

export type GetProductInventoriesParams =
  paths['/api/realestate/product-inventories/']['get']['parameters']['query']
export type GetProductInventoriesDropdownParams =
  paths['/api/realestate/product-inventories/dropdown/']['get']['parameters']['query']
type BaseDropdownQueryParams = NonNullable<GetProductInventoriesDropdownParams>

export type GetProductInventoriesDropdownFilterParams = Omit<
  BaseDropdownQueryParams,
  'id__in' | 'status__in'
> & {
  exchange?: number
  id__in?: number[] | string
  status__in?: string | BaseDropdownQueryParams['status__in']
}
export type GetProductInventoryF2ReconciliationHistoryParams =
  paths['/api/realestate/product-inventories/{id}/f2-reconciliation-history/']['get']['parameters']['query']
export type GetProductInventoryInvestorReconciliationHistoryParams =
  paths['/api/realestate/product-inventories/{id}/investor-reconciliation-history/']['get']['parameters']['query']
export type F2ReconciliationHistory = components['schemas']['F2ReconciliationHistory']
export type InvestorReconciliationHistory = components['schemas']['InvestorReconciliationHistory']
export type CTVReconciliationHistory = components['schemas']['CTVReconciliationHistory']

export type SourceExchange = components['schemas']['SourceExchange']
export type SourceExchangeRequest = components['schemas']['SourceExchangeRequest']
export type PatchedSourceExchangeRequest = components['schemas']['PatchedSourceExchangeRequest']
export type PaginatedSourceExchangeList = components['schemas']['PaginatedSourceExchangeList']

export type GetSourceExchangesParams =
  paths['/api/realestate/source-exchanges/']['get']['parameters']['query']
export type GetSourceExchangesDropdownParams =
  paths['/api/realestate/source-exchanges/dropdown/']['get']['parameters']['query']

export type GetSalesAllocationsParams =
  paths['/api/realestate/sales-allocations/']['get']['parameters']['query']
export type GetSalesAllocationsDropdownParams =
  paths['/api/realestate/sales-allocations/dropdown/']['get']['parameters']['query']
export type GetSalesAllocationsExportParams =
  paths['/api/realestate/sales-allocations/export/']['get']['parameters']['query']
export type GetCommissionRecipientsParams =
  paths['/api/realestate/sales-allocations/{sa_pk}/tbc-commissions/']['get']['parameters']['query']
export type GetTbcF2sParams =
  paths['/api/realestate/sales-allocations/{sa_pk}/tbc-f2s/']['get']['parameters']['query']
export type GetTbcInvestorsParams =
  paths['/api/realestate/sales-allocations/{sa_pk}/tbc-f2s/']['get']['parameters']['query']
export type GetTbcCommissionsParams =
  paths['/api/realestate/sales-allocations/{sa_pk}/tbc-commissions/']['get']['parameters']['query']

/**
 * RealEstate service extending the base API service
 * Provides real estate project-related API operations
 */
export class RealEstateService extends BaseApiService {
  /**
   * Get all projects
   */
  async getProjects(params?: GetProjectsParams) {
    return await this.getPaginated(ApiPaths.realestate_projects_list, params)
  }

  /**
   * Get project by ID
   */
  async getProject(id: number) {
    return await this.get(ApiPaths.realestate_projects_retrieve, {
      path: { id: id },
    })
  }

  /**
   * Get project staffs
   */
  async getProjectStaffs(params?: any) {
    return await this.getPaginated(ApiPaths.realestate_project_staff_list, params)
  }

  /**
   * Create a new project staff
   */
  async createProjectStaff(data: ProjectStaffRequest) {
    return await this.post(ApiPaths.realestate_project_staff_create, data)
  }

  /**
   * Update project staff
   */
  async updateProjectStaff(id: number, data: ProjectStaffRequest) {
    return await this.put(
      ApiPaths.realestate_project_staff_retrieve as ApiPaths.realestate_projects_update,
      data as never,
      {
        path: { id },
      }
    )
  }

  /**
   * Partially update project staff
   */
  async partialUpdateProjectStaff(id: number, data: PatchedProjectStaffRequest) {
    return await this.patch(ApiPaths.realestate_project_staff_partial_update, data as never, {
      path: { id },
    })
  }

  /**
   * Delete project staff
   */
  async deleteProjectStaff(id: number) {
    return await this.delete(
      ApiPaths.realestate_project_staff_retrieve as ApiPaths.realestate_projects_update,
      {
        path: { id },
      }
    )
  }

  /**
   * Create a new project
   */
  async createProject(projectData: ProjectRequest) {
    return await this.post(ApiPaths.realestate_projects_create, projectData)
  }

  /**
   * Update project
   */
  async updateProject(id: number, projectData: ProjectRequest) {
    return await this.put(ApiPaths.realestate_projects_update, projectData, {
      path: { id },
    })
  }

  /**
   * Partially update project
   */
  async partialUpdateProject(id: number, projectData: PatchedProjectRequest) {
    return await this.patch(ApiPaths.realestate_projects_partial_update, projectData, {
      path: { id },
    })
  }

  /**
   * Delete project
   */
  async deleteProject(id: number) {
    return await this.delete(ApiPaths.realestate_projects_destroy, { path: { id } })
  }

  /**
   * Get project histories
   */
  async getProjectHistories(id: number, params?: HistoriesParams) {
    return await this.get(ApiPaths.realestate_projects_histories_retrieve, {
      path: { id: id },
      query: params,
    })
  }

  /**
   * Get project history detail
   */
  async getProjectHistory(id: number, logId: string) {
    return await this.get(ApiPaths.realestate_projects_history_retrieve, {
      path: { id: id, log_id: logId },
    })
  }

  /**
   * Export projects
   */
  async exportProjects(params?: GetProjectsParams) {
    return await this.get(ApiPaths.realestate_projects_export_retrieve, {
      // @ts-ignore: Schema defines query as never but API supports it
      query: params,
    })
  }

  /**
   * Get project dropdown list
   */
  async getProjectDropdown(params?: GetProjectsDropdownParams) {
    return await this.getPaginated(ApiPaths.realestate_projects_dropdown_list, params)
  }

  /**
   * Get all investors
   */
  async getInvestors(params?: GetInvestorsParams) {
    return await this.getPaginated(ApiPaths.realestate_investors_list, params)
  }

  /**
   * Get investor by ID
   */
  async getInvestor(id: number) {
    return await this.get(ApiPaths.realestate_investors_retrieve, {
      path: { id },
    })
  }

  /**
   * Create a new investor
   */
  async createInvestor(data: InvestorRequest) {
    return await this.post(ApiPaths.realestate_investors_create, data)
  }

  /**
   * Update investor
   */
  async updateInvestor(id: number, data: InvestorRequest) {
    return await this.put(ApiPaths.realestate_investors_update, data, {
      path: { id },
    })
  }

  /**
   * Partially update investor
   */
  async partialUpdateInvestor(id: number, data: PatchedInvestorRequest) {
    return await this.patch(ApiPaths.realestate_investors_partial_update, data, {
      path: { id },
    })
  }

  /**
   * Delete investor
   */
  async deleteInvestor(id: number) {
    return await this.delete(ApiPaths.realestate_investors_destroy, {
      path: { id },
    })
  }

  /**
   * Get investor dropdown list
   */
  async getInvestorDropdown(params?: GetInvestorsDropdownParams) {
    return await this.getPaginated(ApiPaths.realestate_investors_dropdown_list, params)
  }

  /**
   * Get investor histories
   */
  async getInvestorHistories(id: number, params?: HistoriesParams) {
    return await this.get(ApiPaths.realestate_investors_histories_retrieve, {
      path: { id },
      query: params,
    })
  }

  /**
   * Get investor history detail
   */
  async getInvestorHistory(id: number, logId: string) {
    return await this.get(ApiPaths.realestate_investors_history_retrieve, {
      path: { id, log_id: logId },
    })
  }

  /**
   * Get all exchanges
   */
  async getExchanges(params?: GetExchangesParams) {
    return await this.getPaginated(ApiPaths.realestate_exchanges_list, params)
  }

  /**
   * Get exchange by ID
   */
  async getExchange(id: number) {
    return await this.get(ApiPaths.realestate_exchanges_retrieve, {
      path: { id },
    })
  }

  /**
   * Create a new exchange
   */
  async createExchange(data: ExchangeRequest) {
    return await this.post(ApiPaths.realestate_exchanges_create, data)
  }

  /**
   * Update exchange
   */
  async updateExchange(id: number, data: ExchangeRequest) {
    return await this.put(ApiPaths.realestate_exchanges_update, data, {
      path: { id },
    })
  }

  /**
   * Partially update exchange
   */
  async partialUpdateExchange(id: number, data: PatchedExchangeRequest) {
    return await this.patch(ApiPaths.realestate_exchanges_partial_update, data, {
      path: { id },
    })
  }

  /**
   * Delete exchange
   */
  async deleteExchange(id: number) {
    return await this.delete(ApiPaths.realestate_exchanges_destroy, {
      path: { id },
    })
  }

  /**
   * Get exchange dropdown list
   */
  async getExchangeDropdown(params?: GetExchangesDropdownParams) {
    return await this.getPaginated(ApiPaths.realestate_exchanges_dropdown_list, params)
  }

  /**
   * Get exchange histories
   */
  async getExchangeHistories(id: number, params?: HistoriesParams) {
    return await this.get(ApiPaths.realestate_exchanges_histories_retrieve, {
      path: { id },
      query: params,
    })
  }

  /**
   * Get exchange history detail
   */
  async getExchangeHistory(id: number, logId: string) {
    return await this.get(ApiPaths.realestate_exchanges_history_retrieve, {
      path: { id, log_id: logId },
    })
  }

  /**
   * Get all product inventories
   */
  async getProductInventories(params?: GetProductInventoriesParams) {
    return await this.getPaginated(ApiPaths.realestate_product_inventories_list, params)
  }

  /**
   * Get product inventory by ID
   */
  async getProductInventory(id: number) {
    return await this.get(ApiPaths.realestate_product_inventories_retrieve, {
      path: { id },
    })
  }

  /**
   * Create a new product inventory
   */
  async createProductInventory(data: ProductInventoryRequest) {
    return await this.post(ApiPaths.realestate_product_inventories_create, data)
  }

  /**
   * Update product inventory
   */
  async updateProductInventory(id: number, data: ProductInventoryRequest) {
    return await this.put(ApiPaths.realestate_product_inventories_update, data, {
      path: { id },
    })
  }

  /**
   * Partially update product inventory
   */
  async partialUpdateProductInventory(id: number, data: PatchedProductInventoryRequest) {
    return await this.patch(ApiPaths.realestate_product_inventories_partial_update, data, {
      path: { id },
    })
  }

  /**
   * Delete product inventory
   */
  async deleteProductInventory(id: number) {
    return await this.delete(ApiPaths.realestate_product_inventories_destroy, {
      path: { id },
    })
  }

  /**
   * Get current commission for a product inventory unit
   */
  async getProductInventoryCurrentCommission(id: number) {
    return await this.get(ApiPaths.realestate_product_inventories_current_commission_retrieve, {
      path: { id },
    })
  }

  /**
   * Get product inventory dropdown list
   */
  async getProductInventoryDropdown(params?: GetProductInventoriesDropdownFilterParams) {
    return await this.getPaginated(ApiPaths.realestate_product_inventories_dropdown_list, params)
  }

  /**
   * Get product inventory histories
   */
  async getProductInventoryHistories(id: number, params?: HistoriesParams) {
    return await this.get(ApiPaths.realestate_product_inventories_histories_retrieve, {
      path: { id },
      query: params,
    })
  }

  /**
   * Get product inventory history detail
   */
  async getProductInventoryHistory(id: number, logId: string) {
    return await this.get(ApiPaths.realestate_product_inventories_history_retrieve, {
      path: { id, log_id: logId },
    })
  }

  async getProductInventoryF2ReconciliationHistory(
    id: number,
    params?: GetProductInventoryF2ReconciliationHistoryParams
  ) {
    return await this.get(ApiPaths.realestate_product_inventories_f2_reconciliation_history_list, {
      path: { id },
      query: params,
    })
  }

  async getProductInventoryInvestorReconciliationHistory(
    id: number,
    params?: GetProductInventoryInvestorReconciliationHistoryParams
  ) {
    return await this.get(
      ApiPaths.realestate_product_inventories_investor_reconciliation_history_list,
      { path: { id }, query: params }
    )
  }

  async getSalesAllocations(params?: GetSalesAllocationsParams) {
    return await this.getPaginated(ApiPaths.realestate_sales_allocations_list, params)
  }

  async getSalesAllocation(id: number) {
    return await this.get(ApiPaths.realestate_sales_allocations_retrieve, {
      path: { id },
    })
  }

  async createSalesAllocation(data: SalesAllocationRequest) {
    return await this.post(ApiPaths.realestate_sales_allocations_create, data)
  }

  async updateSalesAllocation(id: number, data: SalesAllocationRequest) {
    return await this.put(ApiPaths.realestate_sales_allocations_update, data, {
      path: { id },
    })
  }

  async partialUpdateSalesAllocation(id: number, data: PatchedSalesAllocationRequest) {
    return await this.patch(ApiPaths.realestate_sales_allocations_partial_update, data, {
      path: { id },
    })
  }

  async deleteSalesAllocation(id: number) {
    return await this.delete(ApiPaths.realestate_sales_allocations_destroy, {
      path: { id },
    })
  }

  async getSalesAllocationsDropdown(params?: GetSalesAllocationsDropdownParams) {
    return await this.getPaginated(ApiPaths.realestate_sales_allocations_dropdown_list, params)
  }

  async getSalesAllocationCommissionWorkspaceCore(saPk: number, referenceDate?: string) {
    return (await this.get(
      ApiPaths.realestate_sales_allocations_tbc_commissions_list as any,
      {
        path: { sa_pk: saPk },
        query: referenceDate ? { reference_date: referenceDate } : undefined,
      } as any
    )) as unknown as components['schemas']['SACoreCommissionWorkspace']
  }

  async getSalesAllocationCommissionWorkspaceManagement(saPk: number, referenceDate?: string) {
    return (await this.get(
      ApiPaths.realestate_sales_allocations_tbc_management_list as any,
      {
        path: { sa_pk: saPk },
        query: referenceDate ? { reference_date: referenceDate } : undefined,
      } as any
    )) as unknown as components['schemas']['SAManagementCommissionWorkspace']
  }

  async getSalesAllocationCommissionWorkspacePromotion(saPk: number, referenceDate?: string) {
    return (await this.get(
      ApiPaths.realestate_sales_allocations_tbc_promotion_list as any,
      {
        path: { sa_pk: saPk },
        query: referenceDate ? { reference_date: referenceDate } : undefined,
      } as any
    )) as unknown as components['schemas']['SAPromotionCommissionWorkspace']
  }

  async getSalesAllocationCommissionWorkspaceF2(saPk: number, referenceDate?: string) {
    return (await this.get(
      ApiPaths.realestate_sales_allocations_tbc_f2s_list as any,
      {
        path: { sa_pk: saPk },
        query: referenceDate ? { reference_date: referenceDate } : undefined,
      } as any
    )) as unknown as components['schemas']['SAF2CommissionWorkspace']
  }

  async getProductInventoryCommissionWorkspaceCore(piPk: number, referenceDate?: string) {
    return (await this.get(
      ApiPaths.realestate_product_inventories_tbc_commissions_list as any,
      {
        path: { pi_pk: piPk },
        query: referenceDate ? { reference_date: referenceDate } : undefined,
      } as any
    )) as unknown as components['schemas']['PICoreCommissionWorkspace']
  }

  async getProductInventoryCommissionWorkspaceManagement(piPk: number, referenceDate?: string) {
    return (await this.get(
      ApiPaths.realestate_product_inventories_tbc_management_list as any,
      {
        path: { pi_pk: piPk },
        query: referenceDate ? { reference_date: referenceDate } : undefined,
      } as any
    )) as unknown as components['schemas']['PIManagementCommissionWorkspace']
  }

  async getProductInventoryCommissionWorkspacePromotion(piPk: number, referenceDate?: string) {
    return (await this.get(
      ApiPaths.realestate_product_inventories_tbc_promotion_list as any,
      {
        path: { pi_pk: piPk },
        query: referenceDate ? { reference_date: referenceDate } : undefined,
      } as any
    )) as unknown as components['schemas']['PIPromotionCommissionWorkspace']
  }

  async getProductInventoryCommissionWorkspaceF2(piPk: number, referenceDate?: string) {
    return (await this.get(
      ApiPaths.realestate_product_inventories_tbc_f2s_list as any,
      {
        path: { pi_pk: piPk },
        query: referenceDate ? { reference_date: referenceDate } : undefined,
      } as any
    )) as unknown as components['schemas']['PIF2CommissionWorkspace']
  }

  async exportSalesAllocations(params?: GetSalesAllocationsExportParams) {
    return await this.get(ApiPaths.realestate_sales_allocations_export_retrieve, {
      // @ts-ignore schema may declare query as never
      query: params,
    })
  }

  async startSalesAllocationsImport(data: SalesAllocationImportStartRequest) {
    return await this.post(ApiPaths.realestate_sales_allocations_import_create, data)
  }

  async downloadSalesAllocationsImportTemplate() {
    return await this.get(ApiPaths.realestate_sales_allocations_import_template_retrieve)
  }

  async getCommissionRecipients(saPk: number, params?: GetCommissionRecipientsParams) {
    return await this.getPaginated(
      ApiPaths.realestate_sales_allocations_tbc_commissions_list,
      params as never,
      { sa_pk: saPk }
    )
  }

  async createCommissionRecipient(saPk: number, data: Record<string, unknown>) {
    return await this.post(
      ApiPaths.realestate_sales_allocations_tbc_commissions_create,
      data as never,
      {
        path: { sa_pk: saPk },
      }
    )
  }

  async getCommissionRecipient(saPk: number, id: number) {
    return await this.get(ApiPaths.realestate_sales_allocations_tbc_commissions_retrieve, {
      path: { sa_pk: saPk, id },
    })
  }

  async updateCommissionRecipient(saPk: number, id: number, data: Record<string, unknown>) {
    return await this.put(
      ApiPaths.realestate_sales_allocations_tbc_commissions_update,
      data as never,
      {
        path: { sa_pk: saPk, id },
      }
    )
  }

  async partialUpdateCommissionRecipient(saPk: number, id: number, data: Record<string, unknown>) {
    return await this.patch(
      ApiPaths.realestate_sales_allocations_tbc_commissions_partial_update,
      data as never,
      {
        path: { sa_pk: saPk, id },
      }
    )
  }

  async deleteCommissionRecipient(saPk: number, id: number) {
    return await this.delete(ApiPaths.realestate_sales_allocations_tbc_commissions_destroy, {
      path: { sa_pk: saPk, id },
    })
  }

  async getTbcF2s(saPk: number, params?: GetTbcF2sParams) {
    return await this.getPaginated(
      ApiPaths.realestate_sales_allocations_tbc_f2s_list,
      params as never,
      { sa_pk: saPk }
    )
  }

  async createTbcF2(saPk: number, data: Record<string, unknown>) {
    return await this.post(ApiPaths.realestate_sales_allocations_tbc_f2s_create, data as never, {
      path: { sa_pk: saPk },
    })
  }

  async getTbcF2(saPk: number, id: number) {
    return await this.get(ApiPaths.realestate_sales_allocations_tbc_f2s_retrieve, {
      path: { sa_pk: saPk, id },
    })
  }

  async updateTbcF2(saPk: number, id: number, data: Record<string, unknown>) {
    return await this.put(ApiPaths.realestate_sales_allocations_tbc_f2s_update, data as never, {
      path: { sa_pk: saPk, id },
    })
  }

  async partialUpdateTbcF2(saPk: number, id: number, data: Record<string, unknown>) {
    return await this.patch(
      ApiPaths.realestate_sales_allocations_tbc_f2s_partial_update,
      data as never,
      {
        path: { sa_pk: saPk, id },
      }
    )
  }

  async deleteTbcF2(saPk: number, id: number) {
    return await this.delete(ApiPaths.realestate_sales_allocations_tbc_f2s_destroy, {
      path: { sa_pk: saPk, id },
    })
  }

  async getTbcPromotions(saPk: number, params?: Record<string, unknown>) {
    return await this.getPaginated(
      ApiPaths.realestate_sales_allocations_tbc_promotion_list,
      params as never,
      { sa_pk: saPk }
    )
  }

  async createTbcPromotion(saPk: number, data: Record<string, unknown>) {
    return await this.post(
      ApiPaths.realestate_sales_allocations_tbc_promotion_create,
      data as never,
      {
        path: { sa_pk: saPk },
      }
    )
  }

  async getTbcPromotion(saPk: number, id: number) {
    return await this.get(ApiPaths.realestate_sales_allocations_tbc_promotion_retrieve, {
      path: { sa_pk: saPk, id },
    })
  }

  async updateTbcPromotion(saPk: number, id: number, data: Record<string, unknown>) {
    return await this.put(
      ApiPaths.realestate_sales_allocations_tbc_promotion_update,
      data as never,
      {
        path: { sa_pk: saPk, id },
      }
    )
  }

  async partialUpdateTbcPromotion(saPk: number, id: number, data: Record<string, unknown>) {
    return await this.patch(
      ApiPaths.realestate_sales_allocations_tbc_promotion_partial_update,
      data as never,
      {
        path: { sa_pk: saPk, id },
      }
    )
  }

  async deleteTbcPromotion(saPk: number, id: number) {
    return await this.delete(ApiPaths.realestate_sales_allocations_tbc_promotion_destroy, {
      path: { sa_pk: saPk, id },
    })
  }

  // Sales Allocation Product Inventories
  async getSalesAllocationProductInventories(saPk: number, params?: GetProductInventoriesParams) {
    return await this.getPaginated(
      ApiPaths.realestate_sales_allocations_product_inventories_list,
      params as never,
      { sa_pk: saPk }
    )
  }

  async getSalesAllocationProductInventory(saPk: number, id: number) {
    return await this.get(ApiPaths.realestate_sales_allocations_product_inventories_retrieve, {
      path: { sa_pk: saPk, id },
    })
  }

  async createSalesAllocationProductInventory(saPk: number, data: ProductInventoryRequest) {
    return await this.post(
      ApiPaths.realestate_sales_allocations_product_inventories_create,
      data as never,
      { path: { sa_pk: saPk } }
    )
  }

  async updateSalesAllocationProductInventory(
    saPk: number,
    id: number,
    data: ProductInventoryRequest
  ) {
    return await this.put(
      ApiPaths.realestate_sales_allocations_product_inventories_update,
      data as never,
      { path: { sa_pk: saPk, id } }
    )
  }

  async partialUpdateSalesAllocationProductInventory(
    saPk: number,
    id: number,
    data: PatchedProductInventoryRequest
  ) {
    return await this.patch(
      ApiPaths.realestate_sales_allocations_product_inventories_partial_update,
      data as never,
      { path: { sa_pk: saPk, id } }
    )
  }

  async deleteSalesAllocationProductInventory(saPk: number, id: number) {
    return await this.delete(ApiPaths.realestate_sales_allocations_product_inventories_destroy, {
      path: { sa_pk: saPk, id },
    })
  }

  async getSalesAllocationProductInventoryHistories(
    saPk: number,
    id: number,
    params?: HistoriesParams
  ) {
    return await this.getPaginated(
      ApiPaths.realestate_sales_allocations_product_inventories_histories_retrieve,
      params as never,
      { sa_pk: saPk, id }
    )
  }

  async getSalesAllocationProductInventoryHistory(saPk: number, id: number, logId: string) {
    return await this.get(
      ApiPaths.realestate_sales_allocations_product_inventories_history_retrieve,
      { path: { sa_pk: saPk, id, log_id: logId } }
    )
  }

  async getTbcInvestors(saPk: number, params?: GetTbcInvestorsParams) {
    return await this.getPaginated(
      ApiPaths.realestate_sales_allocations_tbc_f2s_list,
      params as never,
      { sa_pk: saPk }
    )
  }

  async createTbcInvestor(saPk: number, data: Record<string, unknown>) {
    return await this.post(ApiPaths.realestate_sales_allocations_tbc_f2s_create, data as never, {
      path: { sa_pk: saPk },
    })
  }

  async getTbcInvestor(saPk: number, id: number) {
    return await this.get(ApiPaths.realestate_sales_allocations_tbc_f2s_retrieve, {
      path: { sa_pk: saPk, id },
    })
  }

  async updateTbcInvestor(saPk: number, id: number, data: Record<string, unknown>) {
    return await this.put(ApiPaths.realestate_sales_allocations_tbc_f2s_update, data as never, {
      path: { sa_pk: saPk, id },
    })
  }

  async partialUpdateTbcInvestor(saPk: number, id: number, data: Record<string, unknown>) {
    return await this.patch(
      ApiPaths.realestate_sales_allocations_tbc_f2s_partial_update,
      data as never,
      {
        path: { sa_pk: saPk, id },
      }
    )
  }

  async deleteTbcInvestor(saPk: number, id: number) {
    return await this.delete(ApiPaths.realestate_sales_allocations_tbc_f2s_destroy, {
      path: { sa_pk: saPk, id },
    })
  }

  async getTbcCommissions(saPk: number, params?: GetTbcCommissionsParams) {
    return await this.getPaginated(
      ApiPaths.realestate_sales_allocations_tbc_commissions_list,
      params as never,
      { sa_pk: saPk }
    )
  }

  async createTbcCommission(saPk: number, data: Record<string, unknown>) {
    return await this.post(
      ApiPaths.realestate_sales_allocations_tbc_commissions_create,
      data as never,
      {
        path: { sa_pk: saPk },
      }
    )
  }

  async getTbcCommission(saPk: number, id: number) {
    return await this.get(ApiPaths.realestate_sales_allocations_tbc_commissions_retrieve, {
      path: { sa_pk: saPk, id },
    })
  }

  async updateTbcCommission(saPk: number, id: number, data: Record<string, unknown>) {
    return await this.put(
      ApiPaths.realestate_sales_allocations_tbc_commissions_update,
      data as never,
      {
        path: { sa_pk: saPk, id },
      }
    )
  }

  async partialUpdateTbcCommission(saPk: number, id: number, data: Record<string, unknown>) {
    return await this.patch(
      ApiPaths.realestate_sales_allocations_tbc_commissions_partial_update,
      data as never,
      {
        path: { sa_pk: saPk, id },
      }
    )
  }

  async deleteTbcCommission(saPk: number, id: number) {
    return await this.delete(ApiPaths.realestate_sales_allocations_tbc_commissions_destroy, {
      path: { sa_pk: saPk, id },
    })
  }

  // ── Duyệt cấu hình TBC lõi (ClickUp 86exm4ud9) ──────────────────────
  // Cấu hình mới sinh ra ở trạng thái `draft` và commission engine không nhìn
  // thấy nó cho tới khi Trưởng phòng Thư ký dự án bấm duyệt. Bốn thao tác dưới
  // đây là toàn bộ đường đổi trạng thái — không có đường nào khác, vì mọi field
  // duyệt đều read-only ở serializer.

  async submitTbcCommission(saPk: number, id: number) {
    return await this.post(
      ApiPaths.realestate_sales_allocations_tbc_commissions_submit_create,
      undefined as never,
      { path: { sa_pk: saPk, id } }
    )
  }

  async approveTbcCommission(saPk: number, id: number) {
    return await this.post(
      ApiPaths.realestate_sales_allocations_tbc_commissions_approve_create,
      undefined as never,
      { path: { sa_pk: saPk, id } }
    )
  }

  async rejectTbcCommission(saPk: number, id: number, reason: string) {
    return await this.post(
      ApiPaths.realestate_sales_allocations_tbc_commissions_reject_create,
      { reason } as never,
      { path: { sa_pk: saPk, id } }
    )
  }

  async revertTbcCommissionToDraft(saPk: number, id: number) {
    return await this.post(
      ApiPaths.realestate_sales_allocations_tbc_commissions_revert_to_draft_create,
      undefined as never,
      { path: { sa_pk: saPk, id } }
    )
  }

  async submitPiTbcCommission(piPk: number, id: number) {
    return await this.post(
      ApiPaths.realestate_product_inventories_tbc_commissions_submit_create,
      undefined as never,
      { path: { pi_pk: piPk, id } }
    )
  }

  async approvePiTbcCommission(piPk: number, id: number) {
    return await this.post(
      ApiPaths.realestate_product_inventories_tbc_commissions_approve_create,
      undefined as never,
      { path: { pi_pk: piPk, id } }
    )
  }

  async rejectPiTbcCommission(piPk: number, id: number, reason: string) {
    return await this.post(
      ApiPaths.realestate_product_inventories_tbc_commissions_reject_create,
      { reason } as never,
      { path: { pi_pk: piPk, id } }
    )
  }

  async revertPiTbcCommissionToDraft(piPk: number, id: number) {
    return await this.post(
      ApiPaths.realestate_product_inventories_tbc_commissions_revert_to_draft_create,
      undefined as never,
      { path: { pi_pk: piPk, id } }
    )
  }

  // TODO(schema): thay chuỗi thô bằng `ApiPaths.*_reopen_create` sau lần `yarn api:update`
  // đầu tiên chạy sau khi BE deploy (MVL-ERP-3/backend, nhánh feat/pi-tbc-reopen-approved-config).
  // Endpoint `reopen/` đưa cấu hình ĐÃ DUYỆT (approved/active/expired) về nháp để sửa lại rồi
  // trình duyệt lại; quyền thuộc người duyệt (`sa_tbc.reopen` / `pi_tbc.reopen`), không phải
  // người lập. Từ chối khi đã có Deal còn hiệu lực dùng cấu hình này.
  async reopenTbcCommission(saPk: number, id: number) {
    return await this.post(
      '/api/realestate/sales-allocations/{sa_pk}/tbc-commissions/{id}/reopen/' as never,
      undefined as never,
      { path: { sa_pk: saPk, id } }
    )
  }

  async reopenPiTbcCommission(piPk: number, id: number) {
    return await this.post(
      '/api/realestate/product-inventories/{pi_pk}/tbc-commissions/{id}/reopen/' as never,
      undefined as never,
      { path: { pi_pk: piPk, id } }
    )
  }

  // Source Exchanges
  async getSourceExchanges(params?: GetSourceExchangesParams) {
    return await this.getPaginated(ApiPaths.realestate_source_exchanges_list, params)
  }

  async getSourceExchange(id: number) {
    return await this.get(ApiPaths.realestate_source_exchanges_retrieve, {
      path: { id },
    })
  }

  async createSourceExchange(data: SourceExchangeRequest) {
    return await this.post(ApiPaths.realestate_source_exchanges_create, data)
  }

  async updateSourceExchange(id: number, data: SourceExchangeRequest) {
    return await this.put(ApiPaths.realestate_source_exchanges_update, data, {
      path: { id },
    })
  }

  async partialUpdateSourceExchange(id: number, data: PatchedSourceExchangeRequest) {
    return await this.patch(ApiPaths.realestate_source_exchanges_partial_update, data, {
      path: { id },
    })
  }

  async deleteSourceExchange(id: number) {
    return await this.delete(ApiPaths.realestate_source_exchanges_destroy, {
      path: { id },
    })
  }

  async getSourceExchangeDropdown(params?: GetSourceExchangesDropdownParams) {
    return await this.getPaginated(ApiPaths.realestate_source_exchanges_dropdown_list, params)
  }

  async getSourceExchangeHistories(id: number, params?: HistoriesParams) {
    return await this.get(ApiPaths.realestate_source_exchanges_histories_retrieve, {
      path: { id },
      query: params,
    })
  }

  async getSourceExchangeHistory(id: number, logId: string) {
    return await this.get(ApiPaths.realestate_source_exchanges_history_retrieve, {
      path: { id, log_id: logId },
    })
  }

  // SA TBC Management
  async getSaTbcManagements(saPk: number, params?: Record<string, unknown>) {
    return await this.getPaginated(
      ApiPaths.realestate_sales_allocations_tbc_management_list,
      params as never,
      { sa_pk: saPk }
    )
  }

  async createSaTbcManagement(saPk: number, data: Record<string, unknown>) {
    return await this.post(
      ApiPaths.realestate_sales_allocations_tbc_management_create,
      data as never,
      { path: { sa_pk: saPk } }
    )
  }

  async getSaTbcManagement(saPk: number, id: number) {
    return await this.get(ApiPaths.realestate_sales_allocations_tbc_management_retrieve, {
      path: { sa_pk: saPk, id },
    })
  }

  async updateSaTbcManagement(saPk: number, id: number, data: Record<string, unknown>) {
    return await this.put(
      ApiPaths.realestate_sales_allocations_tbc_management_update,
      data as never,
      { path: { sa_pk: saPk, id } }
    )
  }

  async partialUpdateSaTbcManagement(saPk: number, id: number, data: Record<string, unknown>) {
    return await this.patch(
      ApiPaths.realestate_sales_allocations_tbc_management_partial_update,
      data as never,
      { path: { sa_pk: saPk, id } }
    )
  }

  async deleteSaTbcManagement(saPk: number, id: number) {
    return await this.delete(ApiPaths.realestate_sales_allocations_tbc_management_destroy, {
      path: { sa_pk: saPk, id },
    })
  }

  // PI TBC Commissions
  async getPiTbcCommissions(piPk: number, params?: Record<string, unknown>) {
    return await this.getPaginated(
      ApiPaths.realestate_product_inventories_tbc_commissions_list,
      params as never,
      { pi_pk: piPk }
    )
  }

  async createPiTbcCommission(piPk: number, data: Record<string, unknown>) {
    return await this.post(
      ApiPaths.realestate_product_inventories_tbc_commissions_create,
      data as never,
      { path: { pi_pk: piPk } }
    )
  }

  async getPiTbcCommission(piPk: number, id: number) {
    return await this.get(ApiPaths.realestate_product_inventories_tbc_commissions_retrieve, {
      path: { pi_pk: piPk, id },
    })
  }

  async updatePiTbcCommission(piPk: number, id: number, data: Record<string, unknown>) {
    return await this.put(
      ApiPaths.realestate_product_inventories_tbc_commissions_update,
      data as never,
      { path: { pi_pk: piPk, id } }
    )
  }

  async partialUpdatePiTbcCommission(piPk: number, id: number, data: Record<string, unknown>) {
    return await this.patch(
      ApiPaths.realestate_product_inventories_tbc_commissions_partial_update,
      data as never,
      { path: { pi_pk: piPk, id } }
    )
  }

  async deletePiTbcCommission(piPk: number, id: number) {
    return await this.delete(ApiPaths.realestate_product_inventories_tbc_commissions_destroy, {
      path: { pi_pk: piPk, id },
    })
  }

  // PI TBC F2S
  async getPiTbcF2s(piPk: number, params?: Record<string, unknown>) {
    return await this.getPaginated(
      ApiPaths.realestate_product_inventories_tbc_f2s_list,
      params as never,
      { pi_pk: piPk }
    )
  }

  async createPiTbcF2(piPk: number, data: Record<string, unknown>) {
    return await this.post(ApiPaths.realestate_product_inventories_tbc_f2s_create, data as never, {
      path: { pi_pk: piPk },
    })
  }

  async getPiTbcF2(piPk: number, id: number) {
    return await this.get(ApiPaths.realestate_product_inventories_tbc_f2s_retrieve, {
      path: { pi_pk: piPk, id },
    })
  }

  async updatePiTbcF2(piPk: number, id: number, data: Record<string, unknown>) {
    return await this.put(ApiPaths.realestate_product_inventories_tbc_f2s_update, data as never, {
      path: { pi_pk: piPk, id },
    })
  }

  async partialUpdatePiTbcF2(piPk: number, id: number, data: Record<string, unknown>) {
    return await this.patch(
      ApiPaths.realestate_product_inventories_tbc_f2s_partial_update,
      data as never,
      { path: { pi_pk: piPk, id } }
    )
  }

  async deletePiTbcF2(piPk: number, id: number) {
    return await this.delete(ApiPaths.realestate_product_inventories_tbc_f2s_destroy, {
      path: { pi_pk: piPk, id },
    })
  }

  // PI TBC Management
  async getPiTbcManagements(piPk: number, params?: Record<string, unknown>) {
    return await this.getPaginated(
      ApiPaths.realestate_product_inventories_tbc_management_list,
      params as never,
      { pi_pk: piPk }
    )
  }

  async createPiTbcManagement(piPk: number, data: Record<string, unknown>) {
    return await this.post(
      ApiPaths.realestate_product_inventories_tbc_management_create,
      data as never,
      { path: { pi_pk: piPk } }
    )
  }

  async getPiTbcManagement(piPk: number, id: number) {
    return await this.get(ApiPaths.realestate_product_inventories_tbc_management_retrieve, {
      path: { pi_pk: piPk, id },
    })
  }

  async updatePiTbcManagement(piPk: number, id: number, data: Record<string, unknown>) {
    return await this.put(
      ApiPaths.realestate_product_inventories_tbc_management_update,
      data as never,
      { path: { pi_pk: piPk, id } }
    )
  }

  async partialUpdatePiTbcManagement(piPk: number, id: number, data: Record<string, unknown>) {
    return await this.patch(
      ApiPaths.realestate_product_inventories_tbc_management_partial_update,
      data as never,
      { path: { pi_pk: piPk, id } }
    )
  }

  async deletePiTbcManagement(piPk: number, id: number) {
    return await this.delete(ApiPaths.realestate_product_inventories_tbc_management_destroy, {
      path: { pi_pk: piPk, id },
    })
  }

  // PI TBC Promotion
  async getPiTbcPromotions(piPk: number, params?: Record<string, unknown>) {
    return await this.getPaginated(
      ApiPaths.realestate_product_inventories_tbc_promotion_list,
      params as never,
      { pi_pk: piPk }
    )
  }

  async createPiTbcPromotion(piPk: number, data: Record<string, unknown>) {
    return await this.post(
      ApiPaths.realestate_product_inventories_tbc_promotion_create,
      data as never,
      { path: { pi_pk: piPk } }
    )
  }

  async getPiTbcPromotion(piPk: number, id: number) {
    return await this.get(ApiPaths.realestate_product_inventories_tbc_promotion_retrieve, {
      path: { pi_pk: piPk, id },
    })
  }

  async updatePiTbcPromotion(piPk: number, id: number, data: Record<string, unknown>) {
    return await this.put(
      ApiPaths.realestate_product_inventories_tbc_promotion_update,
      data as never,
      { path: { pi_pk: piPk, id } }
    )
  }

  async partialUpdatePiTbcPromotion(piPk: number, id: number, data: Record<string, unknown>) {
    return await this.patch(
      ApiPaths.realestate_product_inventories_tbc_promotion_partial_update,
      data as never,
      { path: { pi_pk: piPk, id } }
    )
  }

  async deletePiTbcPromotion(piPk: number, id: number) {
    return await this.delete(ApiPaths.realestate_product_inventories_tbc_promotion_destroy, {
      path: { pi_pk: piPk, id },
    })
  }

  async createProjectDocument(projectPk: number, data: Record<string, unknown>) {
    return await this.post(ApiPaths.realestate_projects_documents_create, data as never, {
      path: { project_pk: projectPk },
    })
  }

  /**
   * Get current F2 commissions for a product inventory unit
   */
  async getProductInventoryCurrentF2Commissions(id: number) {
    return await this.get(ApiPaths.realestate_product_inventories_current_f2_commissions_retrieve, {
      path: { id },
    })
  }

  /**
   * Get TBC context for a product inventory unit
   */
  async getProductInventoryTbcContext(id: number) {
    return await this.get(ApiPaths.realestate_product_inventories_tbc_context_retrieve, {
      path: { id },
    })
  }

  /**
   * Get histories for a sales allocation
   */
  async getSalesAllocationHistories(id: number, params?: HistoriesParams) {
    return await this.get(ApiPaths.realestate_sales_allocations_histories_retrieve, {
      path: { id },
      query: params,
    })
  }

  /**
   * Get history detail for a sales allocation
   */
  async getSalesAllocationHistory(id: number, logId: string) {
    return await this.get(ApiPaths.realestate_sales_allocations_history_retrieve, {
      path: { id, log_id: logId },
    })
  }

  /**
   * Get trashed documents for a project
   */
  async getProjectDocumentsTrash(projectPk: number) {
    return await this.get(ApiPaths.realestate_projects_documents_trash_retrieve, {
      path: { project_pk: projectPk },
    })
  }

  /**
   * Restore a trashed project document
   */
  async restoreProjectDocument(projectPk: number, id: number) {
    return await this.post(
      ApiPaths.realestate_projects_documents_restore_create,
      undefined as never,
      { path: { project_pk: projectPk, id } }
    )
  }

  /**
   * Permanently delete a trashed project document
   */
  async purgeProjectDocument(projectPk: number, id: number) {
    return await this.delete(ApiPaths.realestate_projects_documents_purge_destroy, {
      path: { project_pk: projectPk, id },
    })
  }
}

// Create service instance via factory (lazy construction)
let _realestateService: RealEstateService | null = null

export function getRealEstateService(): RealEstateService {
  if (!_realestateService) {
    _realestateService = new RealEstateService()
  }
  return _realestateService
}

// For backward compatibility, export a getter
export const realestateService = {
  get instance() {
    return getRealEstateService()
  },
}

// React Query hooks for project operations
export function useProjects(params?: GetProjectsParams, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.REALESTATE.PROJECTS.LIST(params || {}),
    () => getRealEstateService().getProjects(params),
    {
      staleTime: 1000 * 60 * 5, // 5 minutes
      enabled: options?.enabled ?? true,
    }
  )
}

export function useProject(id: number) {
  return useApiQuery(
    QUERY_KEYS.REALESTATE.PROJECTS.DETAIL(id),
    () => getRealEstateService().getProject(id),
    {
      enabled: !!id,
      staleTime: 1000 * 60 * 5, // 5 minutes
    }
  )
}

export function useProjectStaffs(params?: any, options?: { enabled?: boolean }) {
  return useApiQuery(
    ['realestate', 'projects', 'staffs', JSON.stringify(params)],
    () => getRealEstateService().getProjectStaffs(params),
    options
  )
}

export function useCreateProjectStaff() {
  return useApiMutation((data: ProjectStaffRequest) =>
    getRealEstateService().createProjectStaff(data)
  )
}

export function useUpdateProjectStaff() {
  return useApiMutation(({ id, data }: { id: number; data: ProjectStaffRequest }) =>
    getRealEstateService().updateProjectStaff(id, data)
  )
}

export function usePartialUpdateProjectStaff() {
  return useApiMutation(({ id, data }: { id: number; data: PatchedProjectStaffRequest }) =>
    getRealEstateService().partialUpdateProjectStaff(id, data)
  )
}

export function useDeleteProjectStaff() {
  return useApiMutation((id: number) => getRealEstateService().deleteProjectStaff(id))
}

export function useCreateProject() {
  return useApiMutation((data: ProjectRequest) => getRealEstateService().createProject(data))
}

export function useUpdateProject() {
  return useApiMutation(({ id, data }: { id: number; data: ProjectRequest }) =>
    getRealEstateService().updateProject(id, data)
  )
}

export function usePartialUpdateProject() {
  return useApiMutation(({ id, data }: { id: number; data: PatchedProjectRequest }) =>
    getRealEstateService().partialUpdateProject(id, data)
  )
}

export function useDeleteProject() {
  return useApiMutation((id: number) => getRealEstateService().deleteProject(id))
}

export function useProjectHistories(id: number, params?: HistoriesParams) {
  return useApiQuery(
    QUERY_KEYS.REALESTATE.PROJECTS.HISTORIES(id, params || {}),
    () => getRealEstateService().getProjectHistories(id, params),
    {
      enabled: !!id,
      staleTime: 1000 * 60 * 5, // 5 minutes
    }
  )
}

export function useProjectHistory(id: number, logId: string) {
  return useApiQuery(
    QUERY_KEYS.REALESTATE.PROJECTS.HISTORY_DETAIL(id, logId),
    () => getRealEstateService().getProjectHistory(id, logId),
    {
      enabled: !!id && !!logId,
      staleTime: 1000 * 60 * 5, // 5 minutes
    }
  )
}

export function useProjectExport() {
  const { openExportDialog: baseOpenExportDialog, isExporting } = useExport<
    NonNullable<GetProjectsExportParams>
  >({
    exportFunction: (params) => getRealEstateService().exportProjects(params),
    defaultFilename: 'projects.xlsx',
  })

  const openExportDialog = useCallback(
    async (searchQuery?: string) => {
      const exportParams: GetProjectsExportParams = {
        async: true,
        delivery: ExportDelivery.link,
      }

      // Map search query to search field (backend supports partial matching)
      if (searchQuery && searchQuery.trim() !== '') {
        exportParams.search = searchQuery.trim()
      }

      await baseOpenExportDialog(exportParams)
    },
    [baseOpenExportDialog]
  )

  return {
    openExportDialog,
    isExporting,
  }
}

// React Query hooks for project dropdown
export function useProjectDropdown(
  params?: GetProjectsDropdownParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.REALESTATE.PROJECTS.DROPDOWN(params || {}),
    () => getRealEstateService().getProjectDropdown(params),
    {
      staleTime: 1000 * 60 * 5,
      enabled: options?.enabled ?? true,
    }
  )
}

// React Query hooks for investor operations
export function useInvestors(params?: GetInvestorsParams, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.REALESTATE.INVESTORS.LIST(params || {}),
    () => getRealEstateService().getInvestors(params),
    {
      staleTime: 1000 * 60 * 5,
      enabled: options?.enabled ?? true,
    }
  )
}

export function useInvestor(id: number) {
  return useApiQuery(
    QUERY_KEYS.REALESTATE.INVESTORS.DETAIL(id),
    () => getRealEstateService().getInvestor(id),
    {
      enabled: !!id,
      staleTime: 1000 * 60 * 5,
    }
  )
}

export function useCreateInvestor() {
  return useApiMutation((data: InvestorRequest) => getRealEstateService().createInvestor(data))
}

export function useUpdateInvestor() {
  return useApiMutation(({ id, data }: { id: number; data: InvestorRequest }) =>
    getRealEstateService().updateInvestor(id, data)
  )
}

export function usePartialUpdateInvestor() {
  return useApiMutation(({ id, data }: { id: number; data: PatchedInvestorRequest }) =>
    getRealEstateService().partialUpdateInvestor(id, data)
  )
}

export function useDeleteInvestor() {
  return useApiMutation((id: number) => getRealEstateService().deleteInvestor(id))
}

export function useInvestorDropdown(
  params?: GetInvestorsDropdownParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.REALESTATE.INVESTORS.DROPDOWN(params || {}),
    () => getRealEstateService().getInvestorDropdown(params),
    {
      staleTime: 1000 * 60 * 5,
      enabled: options?.enabled ?? true,
    }
  )
}

export function useInvestorHistories(id: number, params?: HistoriesParams) {
  return useApiQuery(
    QUERY_KEYS.REALESTATE.INVESTORS.HISTORIES(id, params || {}),
    () => getRealEstateService().getInvestorHistories(id, params),
    {
      enabled: !!id,
      staleTime: 1000 * 60 * 5,
    }
  )
}

export function useInvestorHistory(id: number, logId: string) {
  return useApiQuery(
    QUERY_KEYS.REALESTATE.INVESTORS.HISTORY_DETAIL(id, logId),
    () => getRealEstateService().getInvestorHistory(id, logId),
    {
      enabled: !!id && !!logId,
      staleTime: 1000 * 60 * 5,
    }
  )
}

// React Query hooks for exchange operations
export function useExchanges(params?: GetExchangesParams, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.REALESTATE.EXCHANGES.LIST(params || {}),
    () => getRealEstateService().getExchanges(params),
    {
      staleTime: 1000 * 60 * 5,
      enabled: options?.enabled ?? true,
    }
  )
}

export function useExchange(id: number, options?: any) {
  return useApiQuery(
    QUERY_KEYS.REALESTATE.EXCHANGES.DETAIL(id),
    () => getRealEstateService().getExchange(id),
    {
      enabled: !!id && (options?.enabled ?? true),
      staleTime: 1000 * 60 * 5,
      ...options,
    }
  )
}

export function useCreateExchange() {
  return useApiMutation((data: ExchangeRequest) => getRealEstateService().createExchange(data))
}

export function useUpdateExchange() {
  return useApiMutation(({ id, data }: { id: number; data: ExchangeRequest }) =>
    getRealEstateService().updateExchange(id, data)
  )
}

export function usePartialUpdateExchange() {
  return useApiMutation(({ id, data }: { id: number; data: PatchedExchangeRequest }) =>
    getRealEstateService().partialUpdateExchange(id, data)
  )
}

export function useDeleteExchange() {
  return useApiMutation((id: number) => getRealEstateService().deleteExchange(id))
}

export function useExchangeDropdown(
  params?: GetExchangesDropdownParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.REALESTATE.EXCHANGES.DROPDOWN(params || {}),
    () => getRealEstateService().getExchangeDropdown(params),
    {
      staleTime: 1000 * 60 * 5,
      enabled: options?.enabled ?? true,
    }
  )
}

export function useExchangeHistories(id: number, params?: HistoriesParams) {
  return useApiQuery(
    QUERY_KEYS.REALESTATE.EXCHANGES.HISTORIES(id, params || {}),
    () => getRealEstateService().getExchangeHistories(id, params),
    {
      enabled: !!id,
      staleTime: 1000 * 60 * 5,
    }
  )
}

export function useExchangeHistory(id: number, logId: string) {
  return useApiQuery(
    QUERY_KEYS.REALESTATE.EXCHANGES.HISTORY_DETAIL(id, logId),
    () => getRealEstateService().getExchangeHistory(id, logId),
    {
      enabled: !!id && !!logId,
      staleTime: 1000 * 60 * 5,
    }
  )
}

// React Query hooks for product inventory operations
export function useProductInventories(
  params?: GetProductInventoriesParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.REALESTATE.PRODUCT_INVENTORIES.LIST(params || {}),
    () => getRealEstateService().getProductInventories(params),
    {
      staleTime: 1000 * 60 * 5,
      enabled: options?.enabled ?? true,
    }
  )
}

export function useProductInventory(id: number) {
  return useApiQuery(
    QUERY_KEYS.REALESTATE.PRODUCT_INVENTORIES.DETAIL(id),
    () => getRealEstateService().getProductInventory(id),
    {
      enabled: !!id,
      staleTime: 1000 * 60 * 5,
    }
  )
}

export function useCreateProductInventory() {
  return useApiMutation((data: ProductInventoryRequest) =>
    getRealEstateService().createProductInventory(data)
  )
}

export function useUpdateProductInventory() {
  return useApiMutation(({ id, data }: { id: number; data: ProductInventoryRequest }) =>
    getRealEstateService().updateProductInventory(id, data)
  )
}

export function usePartialUpdateProductInventory() {
  return useApiMutation(({ id, data }: { id: number; data: PatchedProductInventoryRequest }) =>
    getRealEstateService().partialUpdateProductInventory(id, data)
  )
}

export function useDeleteProductInventory() {
  return useApiMutation((id: number) => getRealEstateService().deleteProductInventory(id))
}

export function useProductInventoryDropdown(
  params?: GetProductInventoriesDropdownFilterParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.REALESTATE.PRODUCT_INVENTORIES.DROPDOWN(params || {}),
    () => getRealEstateService().getProductInventoryDropdown(params),
    {
      staleTime: 1000 * 60 * 5,
      enabled: options?.enabled ?? true,
    }
  )
}

export function useProductInventoryHistories(id: number, params?: HistoriesParams) {
  return useApiQuery(
    QUERY_KEYS.REALESTATE.PRODUCT_INVENTORIES.HISTORIES(id, params || {}),
    () => getRealEstateService().getProductInventoryHistories(id, params),
    {
      enabled: !!id,
      staleTime: 1000 * 60 * 5,
    }
  )
}

export function useProductInventoryHistory(id: number, logId: string) {
  return useApiQuery(
    QUERY_KEYS.REALESTATE.PRODUCT_INVENTORIES.HISTORY_DETAIL(id, logId),
    () => getRealEstateService().getProductInventoryHistory(id, logId),
    {
      enabled: !!id && !!logId,
      staleTime: 1000 * 60 * 5,
    }
  )
}

export function useProductInventoryF2ReconciliationHistory(
  id: number,
  params?: GetProductInventoryF2ReconciliationHistoryParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.REALESTATE.PRODUCT_INVENTORIES.F2_RECONCILIATION_HISTORY(id, params || {}),
    () => getRealEstateService().getProductInventoryF2ReconciliationHistory(id, params),
    { enabled: !!id && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useProductInventoryInvestorReconciliationHistory(
  id: number,
  params?: GetProductInventoryInvestorReconciliationHistoryParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.REALESTATE.PRODUCT_INVENTORIES.INVESTOR_RECONCILIATION_HISTORY(id, params || {}),
    () => getRealEstateService().getProductInventoryInvestorReconciliationHistory(id, params),
    { enabled: !!id && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useSalesAllocationsExport() {
  const { openExportDialog: baseOpenExportDialog, isExporting } = useExport<
    NonNullable<GetSalesAllocationsExportParams>
  >({
    exportFunction: (params) => getRealEstateService().exportSalesAllocations(params),
    defaultFilename: 'sales-allocations.xlsx',
  })

  const openExportDialog = useCallback(
    async (searchQuery?: string) => {
      const exportParams: GetSalesAllocationsExportParams = {
        async: true,
        delivery: ExportDelivery.link,
      }

      if (searchQuery && searchQuery.trim() !== '') {
        ;(exportParams as any).search = searchQuery.trim()
      }

      await baseOpenExportDialog(exportParams)
    },
    [baseOpenExportDialog]
  )

  return {
    openExportDialog,
    isExporting,
  }
}

export function useStartSalesAllocationsImport() {
  return useApiMutation((data: SalesAllocationImportStartRequest) =>
    getRealEstateService().startSalesAllocationsImport(data)
  )
}

export function useSalesAllocationsImportTemplate() {
  return useApiQuery(['realestate', 'sales-allocations', 'import_template'], () =>
    getRealEstateService().downloadSalesAllocationsImportTemplate()
  )
}

export function useSalesAllocations(
  params?: GetSalesAllocationsParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.REALESTATE.SALES_ALLOCATIONS.LIST(params || {}),
    () => getRealEstateService().getSalesAllocations(params),
    {
      staleTime: 1000 * 60 * 5,
      enabled: options?.enabled ?? true,
    }
  )
}

export function useSalesAllocation(id: number) {
  return useApiQuery(
    QUERY_KEYS.REALESTATE.SALES_ALLOCATIONS.DETAIL(id),
    () => getRealEstateService().getSalesAllocation(id),
    {
      enabled: !!id,
      staleTime: 1000 * 60 * 5,
    }
  )
}

export function useCreateSalesAllocation() {
  return useApiMutation((data: SalesAllocationRequest) =>
    getRealEstateService().createSalesAllocation(data)
  )
}

export function useUpdateSalesAllocation() {
  return useApiMutation((variables: { id: number; data: SalesAllocationRequest }) =>
    getRealEstateService().updateSalesAllocation(variables.id, variables.data)
  )
}

export function usePartialUpdateSalesAllocation() {
  return useApiMutation((variables: { id: number; data: PatchedSalesAllocationRequest }) =>
    getRealEstateService().partialUpdateSalesAllocation(variables.id, variables.data)
  )
}

export function useDeleteSalesAllocation() {
  return useApiMutation((id: number) => getRealEstateService().deleteSalesAllocation(id))
}

export function useCommissionWorkspaceSACore(saleAllocationId: number, referenceDate?: string) {
  return useApiQuery(
    ['commission-workspace', 'sa-core', saleAllocationId, referenceDate],
    () =>
      getRealEstateService().getSalesAllocationCommissionWorkspaceCore(
        saleAllocationId,
        referenceDate
      ),
    { enabled: !!saleAllocationId, staleTime: 1000 * 60 * 5 }
  )
}

// ── Duyệt cấu hình TBC lõi (ClickUp 86exm4ud9) ────────────────────────
// `useApiMutation` invalidate toàn bộ query khi thành công, nên workspace tự
// nạp lại và ô Trạng thái / Người duyệt đổi ngay — không cần invalidate tay.
// `showErrorToast` bật ở cả bốn: người dùng có thể bấm đúng nút mà vẫn bị BE
// từ chối (thiếu quyền `sa_tbc.approve`, hoặc bản ghi vừa bị người khác đổi
// trạng thái), và im lặng ở đây đọc y hệt "bấm không ăn".

type TbcApprovalVars = { saPk: number; id: number }
type TbcRejectVars = TbcApprovalVars & { reason: string }

export function useSubmitTbcCommission() {
  return useApiMutation(
    ({ saPk, id }: TbcApprovalVars) => getRealEstateService().submitTbcCommission(saPk, id),
    { showErrorToast: true }
  )
}

export function useApproveTbcCommission() {
  return useApiMutation(
    ({ saPk, id }: TbcApprovalVars) => getRealEstateService().approveTbcCommission(saPk, id),
    { showErrorToast: true }
  )
}

export function useRejectTbcCommission() {
  return useApiMutation(
    ({ saPk, id, reason }: TbcRejectVars) =>
      getRealEstateService().rejectTbcCommission(saPk, id, reason),
    { showErrorToast: true }
  )
}

export function useRevertTbcCommissionToDraft() {
  return useApiMutation(
    ({ saPk, id }: TbcApprovalVars) => getRealEstateService().revertTbcCommissionToDraft(saPk, id),
    { showErrorToast: true }
  )
}

type PiTbcApprovalVars = { piPk: number; id: number }
type PiTbcRejectVars = PiTbcApprovalVars & { reason: string }

export function useSubmitPiTbcCommission() {
  return useApiMutation(
    ({ piPk, id }: PiTbcApprovalVars) => getRealEstateService().submitPiTbcCommission(piPk, id),
    { showErrorToast: true }
  )
}

export function useApprovePiTbcCommission() {
  return useApiMutation(
    ({ piPk, id }: PiTbcApprovalVars) => getRealEstateService().approvePiTbcCommission(piPk, id),
    { showErrorToast: true }
  )
}

export function useRejectPiTbcCommission() {
  return useApiMutation(
    ({ piPk, id, reason }: PiTbcRejectVars) =>
      getRealEstateService().rejectPiTbcCommission(piPk, id, reason),
    { showErrorToast: true }
  )
}

export function useReopenTbcCommission() {
  return useApiMutation(
    ({ saPk, id }: TbcApprovalVars) => getRealEstateService().reopenTbcCommission(saPk, id),
    { showErrorToast: true }
  )
}

export function useReopenPiTbcCommission() {
  return useApiMutation(
    ({ piPk, id }: PiTbcApprovalVars) => getRealEstateService().reopenPiTbcCommission(piPk, id),
    { showErrorToast: true }
  )
}

export function useRevertPiTbcCommissionToDraft() {
  return useApiMutation(
    ({ piPk, id }: PiTbcApprovalVars) =>
      getRealEstateService().revertPiTbcCommissionToDraft(piPk, id),
    { showErrorToast: true }
  )
}

export function useCommissionWorkspaceSAManagement(
  saleAllocationId: number,
  referenceDate?: string
) {
  return useApiQuery(
    ['commission-workspace', 'sa-management', saleAllocationId, referenceDate],
    () =>
      getRealEstateService().getSalesAllocationCommissionWorkspaceManagement(
        saleAllocationId,
        referenceDate
      ),
    { enabled: !!saleAllocationId, staleTime: 1000 * 60 * 5 }
  )
}

export function useCommissionWorkspaceSAF2(saleAllocationId: number, referenceDate?: string) {
  return useApiQuery(
    ['commission-workspace', 'sa-f2', saleAllocationId, referenceDate],
    () =>
      getRealEstateService().getSalesAllocationCommissionWorkspaceF2(
        saleAllocationId,
        referenceDate
      ),
    { enabled: !!saleAllocationId, staleTime: 1000 * 60 * 5 }
  )
}

export function useCommissionWorkspacePICore(productInventoryId: number, referenceDate?: string) {
  return useApiQuery(
    ['commission-workspace', 'pi-core', productInventoryId, referenceDate],
    () =>
      getRealEstateService().getProductInventoryCommissionWorkspaceCore(
        productInventoryId,
        referenceDate
      ),
    { enabled: !!productInventoryId, staleTime: 1000 * 60 * 5 }
  )
}

export function useCommissionWorkspacePIManagement(
  productInventoryId: number,
  referenceDate?: string
) {
  return useApiQuery(
    ['commission-workspace', 'pi-management', productInventoryId, referenceDate],
    () =>
      getRealEstateService().getProductInventoryCommissionWorkspaceManagement(
        productInventoryId,
        referenceDate
      ),
    { enabled: !!productInventoryId, staleTime: 1000 * 60 * 5 }
  )
}

export function useCommissionWorkspacePIPromotion(
  productInventoryId: number,
  referenceDate?: string
) {
  return useApiQuery(
    ['commission-workspace', 'pi-promotion', productInventoryId, referenceDate],
    () =>
      getRealEstateService().getProductInventoryCommissionWorkspacePromotion(
        productInventoryId,
        referenceDate
      ),
    { enabled: !!productInventoryId, staleTime: 1000 * 60 * 5 }
  )
}

export function useCommissionWorkspacePIF2(productInventoryId: number, referenceDate?: string) {
  return useApiQuery(
    ['commission-workspace', 'pi-f2', productInventoryId, referenceDate],
    () =>
      getRealEstateService().getProductInventoryCommissionWorkspaceF2(
        productInventoryId,
        referenceDate
      ),
    { enabled: !!productInventoryId, staleTime: 1000 * 60 * 5 }
  )
}

export function useSalesAllocationsDropdown(
  params?: GetSalesAllocationsDropdownParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.REALESTATE.SALES_ALLOCATIONS.DROPDOWN(params || {}),
    () => getRealEstateService().getSalesAllocationsDropdown(params),
    {
      staleTime: 1000 * 60 * 5,
      enabled: options?.enabled ?? true,
    }
  )
}

export function useSalesAllocationProductInventories(
  saPk: number,
  params?: GetProductInventoriesParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.REALESTATE.SALES_ALLOCATIONS.PRODUCT_INVENTORIES.LIST(saPk, params || {}),
    () => getRealEstateService().getSalesAllocationProductInventories(saPk, params),
    {
      staleTime: 1000 * 60 * 5,
      enabled: !!saPk && (options?.enabled ?? true),
    }
  )
}

export function useSalesAllocationProductInventory(saPk: number, id: number) {
  return useApiQuery(
    QUERY_KEYS.REALESTATE.SALES_ALLOCATIONS.PRODUCT_INVENTORIES.DETAIL(saPk, id),
    () => getRealEstateService().getSalesAllocationProductInventory(saPk, id),
    {
      enabled: !!saPk && !!id,
      staleTime: 1000 * 60 * 5,
    }
  )
}

export function useCreateSalesAllocationProductInventory() {
  return useApiMutation((variables: { saPk: number; data: ProductInventoryRequest }) =>
    getRealEstateService().createSalesAllocationProductInventory(variables.saPk, variables.data)
  )
}

export function useUpdateSalesAllocationProductInventory() {
  return useApiMutation((variables: { saPk: number; id: number; data: ProductInventoryRequest }) =>
    getRealEstateService().updateSalesAllocationProductInventory(
      variables.saPk,
      variables.id,
      variables.data
    )
  )
}

export function usePartialUpdateSalesAllocationProductInventory() {
  return useApiMutation(
    (variables: { saPk: number; id: number; data: PatchedProductInventoryRequest }) =>
      getRealEstateService().partialUpdateSalesAllocationProductInventory(
        variables.saPk,
        variables.id,
        variables.data
      )
  )
}

export function useDeleteSalesAllocationProductInventory() {
  return useApiMutation((variables: { saPk: number; id: number }) =>
    getRealEstateService().deleteSalesAllocationProductInventory(variables.saPk, variables.id)
  )
}

export function useSalesAllocationProductInventoryHistories(
  saPk: number,
  id: number,
  params?: HistoriesParams
) {
  return useApiQuery(
    QUERY_KEYS.REALESTATE.SALES_ALLOCATIONS.PRODUCT_INVENTORIES.HISTORIES(saPk, id, params || {}),
    () => getRealEstateService().getSalesAllocationProductInventoryHistories(saPk, id, params),
    {
      enabled: !!saPk && !!id,
      staleTime: 1000 * 60 * 5,
    }
  )
}

export function useSalesAllocationProductInventoryHistory(saPk: number, id: number, logId: string) {
  return useApiQuery(
    QUERY_KEYS.REALESTATE.SALES_ALLOCATIONS.PRODUCT_INVENTORIES.HISTORY_DETAIL(saPk, id, logId),
    () => getRealEstateService().getSalesAllocationProductInventoryHistory(saPk, id, logId),
    {
      enabled: !!saPk && !!id && !!logId,
      staleTime: 1000 * 60 * 5,
    }
  )
}

export function useCommissionRecipients(
  saPk: number,
  params?: GetCommissionRecipientsParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    [
      'realestate',
      'sales-allocations',
      saPk,
      'commission-recipients',
      JSON.stringify(params || {}),
    ],
    () => getRealEstateService().getCommissionRecipients(saPk, params),
    { enabled: !!saPk && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useCreateCommissionRecipient() {
  return useApiMutation((variables: { saPk: number; data: Record<string, unknown> }) =>
    getRealEstateService().createCommissionRecipient(variables.saPk, variables.data)
  )
}

export function useCommissionRecipient(saPk: number, id: number, options?: { enabled?: boolean }) {
  return useApiQuery(
    ['realestate', 'sales-allocations', saPk, 'commission-recipients', 'detail', id],
    () => getRealEstateService().getCommissionRecipient(saPk, id),
    { enabled: !!saPk && !!id && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useUpdateCommissionRecipient() {
  return useApiMutation((variables: { saPk: number; id: number; data: Record<string, unknown> }) =>
    getRealEstateService().updateCommissionRecipient(variables.saPk, variables.id, variables.data)
  )
}

export function usePartialUpdateCommissionRecipient() {
  return useApiMutation((variables: { saPk: number; id: number; data: Record<string, unknown> }) =>
    getRealEstateService().partialUpdateCommissionRecipient(
      variables.saPk,
      variables.id,
      variables.data
    )
  )
}

export function useDeleteCommissionRecipient() {
  return useApiMutation((variables: { saPk: number; id: number }) =>
    getRealEstateService().deleteCommissionRecipient(variables.saPk, variables.id)
  )
}

export function useTbcF2s(saPk: number, params?: GetTbcF2sParams, options?: { enabled?: boolean }) {
  return useApiQuery(
    ['realestate', 'sales-allocations', saPk, 'tbc-f2s', JSON.stringify(params || {})],
    () => getRealEstateService().getTbcF2s(saPk, params),
    { enabled: !!saPk && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useCreateTbcF2() {
  return useApiMutation((variables: { saPk: number; data: Record<string, unknown> }) =>
    getRealEstateService().createTbcF2(variables.saPk, variables.data)
  )
}

export function useTbcF2(saPk: number, id: number, options?: { enabled?: boolean }) {
  return useApiQuery(
    ['realestate', 'sales-allocations', saPk, 'tbc-f2s', 'detail', id],
    () => getRealEstateService().getTbcF2(saPk, id),
    { enabled: !!saPk && !!id && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useUpdateTbcF2() {
  return useApiMutation((variables: { saPk: number; id: number; data: Record<string, unknown> }) =>
    getRealEstateService().updateTbcF2(variables.saPk, variables.id, variables.data)
  )
}

export function usePartialUpdateTbcF2() {
  return useApiMutation((variables: { saPk: number; id: number; data: Record<string, unknown> }) =>
    getRealEstateService().partialUpdateTbcF2(variables.saPk, variables.id, variables.data)
  )
}

export function useDeleteTbcF2() {
  return useApiMutation((variables: { saPk: number; id: number }) =>
    getRealEstateService().deleteTbcF2(variables.saPk, variables.id)
  )
}

export function useTbcPromotions(
  saPk: number,
  params?: Record<string, unknown>,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    ['realestate', 'sales-allocations', saPk, 'tbc-promotions', JSON.stringify(params || {})],
    () => getRealEstateService().getTbcPromotions(saPk, params),
    { enabled: !!saPk && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useCreateTbcPromotion() {
  return useApiMutation((variables: { saPk: number; data: Record<string, unknown> }) =>
    getRealEstateService().createTbcPromotion(variables.saPk, variables.data)
  )
}

export function useTbcPromotion(saPk: number, id: number, options?: { enabled?: boolean }) {
  return useApiQuery(
    ['realestate', 'sales-allocations', saPk, 'tbc-promotions', 'detail', id],
    () => getRealEstateService().getTbcPromotion(saPk, id),
    { enabled: !!saPk && !!id && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useUpdateTbcPromotion() {
  return useApiMutation((variables: { saPk: number; id: number; data: Record<string, unknown> }) =>
    getRealEstateService().updateTbcPromotion(variables.saPk, variables.id, variables.data)
  )
}

export function usePartialUpdateTbcPromotion() {
  return useApiMutation((variables: { saPk: number; id: number; data: Record<string, unknown> }) =>
    getRealEstateService().partialUpdateTbcPromotion(variables.saPk, variables.id, variables.data)
  )
}

export function useDeleteTbcPromotion() {
  return useApiMutation((variables: { saPk: number; id: number }) =>
    getRealEstateService().deleteTbcPromotion(variables.saPk, variables.id)
  )
}

export function useTbcInvestors(
  saPk: number,
  params?: GetTbcInvestorsParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    ['realestate', 'sales-allocations', saPk, 'tbc-f2s', JSON.stringify(params || {})],
    () => getRealEstateService().getTbcInvestors(saPk, params),
    { enabled: !!saPk && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useCreateTbcInvestor() {
  return useApiMutation((variables: { saPk: number; data: Record<string, unknown> }) =>
    getRealEstateService().createTbcInvestor(variables.saPk, variables.data)
  )
}

export function useTbcInvestor(saPk: number, id: number, options?: { enabled?: boolean }) {
  return useApiQuery(
    ['realestate', 'sales-allocations', saPk, 'tbc-f2s', 'detail', id],
    () => getRealEstateService().getTbcInvestor(saPk, id),
    { enabled: !!saPk && !!id && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useUpdateTbcInvestor() {
  return useApiMutation((variables: { saPk: number; id: number; data: Record<string, unknown> }) =>
    getRealEstateService().updateTbcInvestor(variables.saPk, variables.id, variables.data)
  )
}

export function usePartialUpdateTbcInvestor() {
  return useApiMutation((variables: { saPk: number; id: number; data: Record<string, unknown> }) =>
    getRealEstateService().partialUpdateTbcInvestor(variables.saPk, variables.id, variables.data)
  )
}

export function useDeleteTbcInvestor() {
  return useApiMutation((variables: { saPk: number; id: number }) =>
    getRealEstateService().deleteTbcInvestor(variables.saPk, variables.id)
  )
}

export function useTbcSales(
  saPk: number,
  params?: GetTbcF2sParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    ['realestate', 'sales-allocations', saPk, 'tbc-sales', JSON.stringify(params || {})],
    () => getRealEstateService().getTbcF2s(saPk, params),
    { enabled: !!saPk && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useCreateTbcSale() {
  return useApiMutation((variables: { saPk: number; data: Record<string, unknown> }) =>
    getRealEstateService().createTbcF2(variables.saPk, variables.data)
  )
}

export function useTbcSale(saPk: number, id: number, options?: { enabled?: boolean }) {
  return useApiQuery(
    ['realestate', 'sales-allocations', saPk, 'tbc-sales', 'detail', id],
    () => getRealEstateService().getTbcF2(saPk, id),
    { enabled: !!saPk && !!id && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useUpdateTbcSale() {
  return useApiMutation((variables: { saPk: number; id: number; data: Record<string, unknown> }) =>
    getRealEstateService().updateTbcF2(variables.saPk, variables.id, variables.data)
  )
}

export function usePartialUpdateTbcSale() {
  return useApiMutation((variables: { saPk: number; id: number; data: Record<string, unknown> }) =>
    getRealEstateService().partialUpdateTbcF2(variables.saPk, variables.id, variables.data)
  )
}

export function useDeleteTbcSale() {
  return useApiMutation((variables: { saPk: number; id: number }) =>
    getRealEstateService().deleteTbcF2(variables.saPk, variables.id)
  )
}

export function useCreateProjectDocument() {
  return useApiMutation((variables: { projectPk: number; data: Record<string, unknown> }) =>
    getRealEstateService().createProjectDocument(variables.projectPk, variables.data)
  )
}

// React Query hooks for source exchange operations
export function useSourceExchanges(
  params?: GetSourceExchangesParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.REALESTATE.SOURCE_EXCHANGES.LIST(params || {}),
    () => getRealEstateService().getSourceExchanges(params),
    {
      staleTime: 1000 * 60 * 5,
      enabled: options?.enabled ?? true,
    }
  )
}

export function useSourceExchange(id: number, options?: any) {
  return useApiQuery(
    QUERY_KEYS.REALESTATE.SOURCE_EXCHANGES.DETAIL(id),
    () => getRealEstateService().getSourceExchange(id),
    {
      enabled: !!id && (options?.enabled ?? true),
      staleTime: 1000 * 60 * 5,
      ...options,
    }
  )
}

export function useCreateSourceExchange() {
  return useApiMutation((data: SourceExchangeRequest) =>
    getRealEstateService().createSourceExchange(data)
  )
}

export function useUpdateSourceExchange() {
  return useApiMutation(({ id, data }: { id: number; data: SourceExchangeRequest }) =>
    getRealEstateService().updateSourceExchange(id, data)
  )
}

export function usePartialUpdateSourceExchange() {
  return useApiMutation(({ id, data }: { id: number; data: PatchedSourceExchangeRequest }) =>
    getRealEstateService().partialUpdateSourceExchange(id, data)
  )
}

export function useDeleteSourceExchange() {
  return useApiMutation((id: number) => getRealEstateService().deleteSourceExchange(id))
}

export function useSourceExchangeDropdown(
  params?: GetSourceExchangesDropdownParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.REALESTATE.SOURCE_EXCHANGES.DROPDOWN(params || {}),
    () => getRealEstateService().getSourceExchangeDropdown(params),
    {
      staleTime: 1000 * 60 * 5,
      enabled: options?.enabled ?? true,
    }
  )
}

export function useSourceExchangeHistories(id: number, params?: HistoriesParams) {
  return useApiQuery(
    QUERY_KEYS.REALESTATE.SOURCE_EXCHANGES.HISTORIES(id, params || {}),
    () => getRealEstateService().getSourceExchangeHistories(id, params),
    {
      enabled: !!id,
      staleTime: 1000 * 60 * 5,
    }
  )
}

export function useSourceExchangeHistory(id: number, logId: string) {
  return useApiQuery(
    QUERY_KEYS.REALESTATE.SOURCE_EXCHANGES.HISTORY_DETAIL(id, logId),
    () => getRealEstateService().getSourceExchangeHistory(id, logId),
    {
      enabled: !!id && !!logId,
      staleTime: 1000 * 60 * 5,
    }
  )
}

// React Query hooks for SA TBC Management
export function useSaTbcManagements(
  saPk: number,
  params?: Record<string, unknown>,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    ['realestate', 'sales-allocations', saPk, 'tbc-management', JSON.stringify(params || {})],
    () => getRealEstateService().getSaTbcManagements(saPk, params),
    { enabled: !!saPk && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useCreateSaTbcManagement() {
  return useApiMutation((variables: { saPk: number; data: Record<string, unknown> }) =>
    getRealEstateService().createSaTbcManagement(variables.saPk, variables.data)
  )
}

export function useSaTbcManagement(saPk: number, id: number, options?: { enabled?: boolean }) {
  return useApiQuery(
    ['realestate', 'sales-allocations', saPk, 'tbc-management', 'detail', id],
    () => getRealEstateService().getSaTbcManagement(saPk, id),
    { enabled: !!saPk && !!id && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useUpdateSaTbcManagement() {
  return useApiMutation((variables: { saPk: number; id: number; data: Record<string, unknown> }) =>
    getRealEstateService().updateSaTbcManagement(variables.saPk, variables.id, variables.data)
  )
}

export function usePartialUpdateSaTbcManagement() {
  return useApiMutation((variables: { saPk: number; id: number; data: Record<string, unknown> }) =>
    getRealEstateService().partialUpdateSaTbcManagement(
      variables.saPk,
      variables.id,
      variables.data
    )
  )
}

export function useDeleteSaTbcManagement() {
  return useApiMutation((variables: { saPk: number; id: number }) =>
    getRealEstateService().deleteSaTbcManagement(variables.saPk, variables.id)
  )
}

// React Query hooks for PI TBC Commissions
export function usePiTbcCommissions(
  piPk: number,
  params?: Record<string, unknown>,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    ['realestate', 'product-inventories', piPk, 'tbc-commissions', JSON.stringify(params || {})],
    () => getRealEstateService().getPiTbcCommissions(piPk, params),
    { enabled: !!piPk && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useCreatePiTbcCommission() {
  return useApiMutation((variables: { piPk: number; data: Record<string, unknown> }) =>
    getRealEstateService().createPiTbcCommission(variables.piPk, variables.data)
  )
}

export function usePiTbcCommission(piPk: number, id: number, options?: { enabled?: boolean }) {
  return useApiQuery(
    ['realestate', 'product-inventories', piPk, 'tbc-commissions', 'detail', id],
    () => getRealEstateService().getPiTbcCommission(piPk, id),
    { enabled: !!piPk && !!id && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useUpdatePiTbcCommission() {
  return useApiMutation((variables: { piPk: number; id: number; data: Record<string, unknown> }) =>
    getRealEstateService().updatePiTbcCommission(variables.piPk, variables.id, variables.data)
  )
}

export function usePartialUpdatePiTbcCommission() {
  return useApiMutation((variables: { piPk: number; id: number; data: Record<string, unknown> }) =>
    getRealEstateService().partialUpdatePiTbcCommission(
      variables.piPk,
      variables.id,
      variables.data
    )
  )
}

export function useDeletePiTbcCommission() {
  return useApiMutation((variables: { piPk: number; id: number }) =>
    getRealEstateService().deletePiTbcCommission(variables.piPk, variables.id)
  )
}

// React Query hooks for PI TBC F2S
export function usePiTbcF2s(
  piPk: number,
  params?: Record<string, unknown>,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    ['realestate', 'product-inventories', piPk, 'tbc-f2s', JSON.stringify(params || {})],
    () => getRealEstateService().getPiTbcF2s(piPk, params),
    { enabled: !!piPk && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useCreatePiTbcF2() {
  return useApiMutation((variables: { piPk: number; data: Record<string, unknown> }) =>
    getRealEstateService().createPiTbcF2(variables.piPk, variables.data)
  )
}

export function usePiTbcF2(piPk: number, id: number, options?: { enabled?: boolean }) {
  return useApiQuery(
    ['realestate', 'product-inventories', piPk, 'tbc-f2s', 'detail', id],
    () => getRealEstateService().getPiTbcF2(piPk, id),
    { enabled: !!piPk && !!id && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useUpdatePiTbcF2() {
  return useApiMutation((variables: { piPk: number; id: number; data: Record<string, unknown> }) =>
    getRealEstateService().updatePiTbcF2(variables.piPk, variables.id, variables.data)
  )
}

export function usePartialUpdatePiTbcF2() {
  return useApiMutation((variables: { piPk: number; id: number; data: Record<string, unknown> }) =>
    getRealEstateService().partialUpdatePiTbcF2(variables.piPk, variables.id, variables.data)
  )
}

export function useDeletePiTbcF2() {
  return useApiMutation((variables: { piPk: number; id: number }) =>
    getRealEstateService().deletePiTbcF2(variables.piPk, variables.id)
  )
}

// React Query hooks for PI TBC Management
export function usePiTbcManagements(
  piPk: number,
  params?: Record<string, unknown>,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    ['realestate', 'product-inventories', piPk, 'tbc-management', JSON.stringify(params || {})],
    () => getRealEstateService().getPiTbcManagements(piPk, params),
    { enabled: !!piPk && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useCreatePiTbcManagement() {
  return useApiMutation((variables: { piPk: number; data: Record<string, unknown> }) =>
    getRealEstateService().createPiTbcManagement(variables.piPk, variables.data)
  )
}

export function usePiTbcManagement(piPk: number, id: number, options?: { enabled?: boolean }) {
  return useApiQuery(
    ['realestate', 'product-inventories', piPk, 'tbc-management', 'detail', id],
    () => getRealEstateService().getPiTbcManagement(piPk, id),
    { enabled: !!piPk && !!id && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useUpdatePiTbcManagement() {
  return useApiMutation((variables: { piPk: number; id: number; data: Record<string, unknown> }) =>
    getRealEstateService().updatePiTbcManagement(variables.piPk, variables.id, variables.data)
  )
}

export function usePartialUpdatePiTbcManagement() {
  return useApiMutation((variables: { piPk: number; id: number; data: Record<string, unknown> }) =>
    getRealEstateService().partialUpdatePiTbcManagement(
      variables.piPk,
      variables.id,
      variables.data
    )
  )
}

export function useDeletePiTbcManagement() {
  return useApiMutation((variables: { piPk: number; id: number }) =>
    getRealEstateService().deletePiTbcManagement(variables.piPk, variables.id)
  )
}

// React Query hooks for PI TBC Promotion
export function usePiTbcPromotions(
  piPk: number,
  params?: Record<string, unknown>,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    ['realestate', 'product-inventories', piPk, 'tbc-promotion', JSON.stringify(params || {})],
    () => getRealEstateService().getPiTbcPromotions(piPk, params),
    { enabled: !!piPk && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useCreatePiTbcPromotion() {
  return useApiMutation((variables: { piPk: number; data: Record<string, unknown> }) =>
    getRealEstateService().createPiTbcPromotion(variables.piPk, variables.data)
  )
}

export function usePiTbcPromotion(piPk: number, id: number, options?: { enabled?: boolean }) {
  return useApiQuery(
    ['realestate', 'product-inventories', piPk, 'tbc-promotion', 'detail', id],
    () => getRealEstateService().getPiTbcPromotion(piPk, id),
    { enabled: !!piPk && !!id && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useUpdatePiTbcPromotion() {
  return useApiMutation((variables: { piPk: number; id: number; data: Record<string, unknown> }) =>
    getRealEstateService().updatePiTbcPromotion(variables.piPk, variables.id, variables.data)
  )
}

export function usePartialUpdatePiTbcPromotion() {
  return useApiMutation((variables: { piPk: number; id: number; data: Record<string, unknown> }) =>
    getRealEstateService().partialUpdatePiTbcPromotion(variables.piPk, variables.id, variables.data)
  )
}

export function useDeletePiTbcPromotion() {
  return useApiMutation((variables: { piPk: number; id: number }) =>
    getRealEstateService().deletePiTbcPromotion(variables.piPk, variables.id)
  )
}

// React Query hooks for product inventory current F2 commissions and TBC context
export function useProductInventoryCurrentF2Commissions(
  id: number,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.REALESTATE.PRODUCT_INVENTORIES.CURRENT_F2_COMMISSIONS(id),
    () => getRealEstateService().getProductInventoryCurrentF2Commissions(id),
    { enabled: !!id && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useProductInventoryCurrentCommission(id: number, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.REALESTATE.PRODUCT_INVENTORIES.CURRENT_COMMISSION(id),
    () => getRealEstateService().getProductInventoryCurrentCommission(id),
    { enabled: !!id && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useProductInventoryTbcContext(id: number, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.REALESTATE.PRODUCT_INVENTORIES.TBC_CONTEXT(id),
    () => getRealEstateService().getProductInventoryTbcContext(id),
    { enabled: !!id && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

// React Query hooks for sales allocation histories
export function useSalesAllocationHistories(id: number, params?: HistoriesParams) {
  return useApiQuery(
    QUERY_KEYS.REALESTATE.SALES_ALLOCATIONS.HISTORIES(id, params || {}),
    () => getRealEstateService().getSalesAllocationHistories(id, params),
    { enabled: !!id, staleTime: 1000 * 60 * 5 }
  )
}

export function useSalesAllocationHistory(id: number, logId: string) {
  return useApiQuery(
    QUERY_KEYS.REALESTATE.SALES_ALLOCATIONS.HISTORY_DETAIL(id, logId),
    () => getRealEstateService().getSalesAllocationHistory(id, logId),
    { enabled: !!id && !!logId, staleTime: 1000 * 60 * 5 }
  )
}

// React Query hooks for project documents trash/restore/purge
export function useProjectDocumentsTrash(projectPk: number, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.REALESTATE.PROJECT_DOCUMENTS.TRASH(projectPk),
    () => getRealEstateService().getProjectDocumentsTrash(projectPk),
    { enabled: !!projectPk && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useRestoreProjectDocument() {
  return useApiMutation((variables: { projectPk: number; id: number }) =>
    getRealEstateService().restoreProjectDocument(variables.projectPk, variables.id)
  )
}

export function usePurgeProjectDocument() {
  return useApiMutation((variables: { projectPk: number; id: number }) =>
    getRealEstateService().purgeProjectDocument(variables.projectPk, variables.id)
  )
}
