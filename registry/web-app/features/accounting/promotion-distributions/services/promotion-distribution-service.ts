import { BaseApiService } from '@/api/base-service'
import { ApiPaths, components, paths } from '@/api/schema'
import { QUERY_KEYS } from '@/constants'
import { useApiMutation, useApiQuery } from '@/hooks/useApiQuery'

export type ProjectPromotionDistribution = components['schemas']['ProjectPromotionDistribution']
export type ProjectPromotionDistributionLine =
  components['schemas']['ProjectPromotionDistributionLine']
export type ProjectPromotionDistributionRequest =
  components['schemas']['ProjectPromotionDistributionRequest']
export type ProjectPromotionDistributionInputRequest =
  components['schemas']['ProjectPromotionDistributionInputRequest']
export type PatchedProjectPromotionDistributionInputRequest =
  components['schemas']['PatchedProjectPromotionDistributionInputRequest']
export type ProjectPromotionDistributionVoidRequest =
  components['schemas']['ProjectPromotionDistributionVoidRequest']
export type PaginatedProjectPromotionDistributionList =
  components['schemas']['PaginatedProjectPromotionDistributionList']
export type PreviewResponse = components['schemas']['PreviewResponse']
export type ProjectPromotionDepartmentAllocation =
  components['schemas']['ProjectPromotionDepartmentAllocation']
export type GetPromotionDistributionsParams =
  paths['/api/accounting/promotion-distributions/']['get']['parameters']['query']

// Eligible-deal breakdown behind total_deals / total_fee_calculation_price.
export type EligibleDeal = components['schemas']['EligibleDeal']

// Bulk draft — one press adds every project that collected money in the period.
export type BulkDraftInputRequest = components['schemas']['BulkDraftInputRequest']
export type BulkDraftResult = components['schemas']['BulkDraftResult']
export type BulkDraftCreated = components['schemas']['BulkDraftCreated']
export type BulkDraftSkipped = components['schemas']['BulkDraftSkipped']

class PromotionDistributionService extends BaseApiService {
  async getPromotionDistributions(params?: GetPromotionDistributionsParams) {
    return await this.getPaginated(ApiPaths.accounting_promotion_distributions_list, params)
  }

  async createPromotionDistribution(data: ProjectPromotionDistributionInputRequest) {
    return await this.post(ApiPaths.accounting_promotion_distributions_create, data)
  }

  async getPromotionDistribution(id: number) {
    return await this.get(ApiPaths.accounting_promotion_distributions_retrieve, { path: { id } })
  }

  async updatePromotionDistribution(id: number, data: ProjectPromotionDistributionRequest) {
    return await this.put(ApiPaths.accounting_promotion_distributions_update, data, {
      path: { id },
    })
  }

  async partialUpdatePromotionDistribution(
    id: number,
    data: PatchedProjectPromotionDistributionInputRequest
  ) {
    return await this.patch(ApiPaths.accounting_promotion_distributions_partial_update, data, {
      path: { id },
    })
  }

  async deletePromotionDistribution(id: number) {
    return await this.delete(ApiPaths.accounting_promotion_distributions_destroy, { path: { id } })
  }

  async confirmPromotionDistribution(id: number, data: ProjectPromotionDistributionRequest) {
    return await this.post(ApiPaths.accounting_promotion_distributions_confirm_create, data, {
      path: { id },
    })
  }

  async reopenPromotionDistribution(id: number, data: ProjectPromotionDistributionRequest) {
    return await this.post(ApiPaths.accounting_promotion_distributions_reopen_create, data, {
      path: { id },
    })
  }

  async voidPromotionDistribution(id: number, data: ProjectPromotionDistributionVoidRequest) {
    return await this.post(ApiPaths.accounting_promotion_distributions_void_create, data, {
      path: { id },
    })
  }

  async previewPromotionDistribution(data: ProjectPromotionDistributionInputRequest) {
    return await this.post(ApiPaths.accounting_promotion_distributions_preview_create, data)
  }

  async bulkDraftPromotionDistributions(data: BulkDraftInputRequest) {
    return await this.post(ApiPaths.accounting_promotion_distributions_bulk_draft_create, data)
  }

  async getDepartmentAllocationsPromotionDistribution(id: number) {
    return await this.get(ApiPaths.accounting_promotion_distributions_department_allocations_list, {
      path: { id },
    })
  }

  async getDealsPromotionDistribution(id: number): Promise<{ results: EligibleDeal[] }> {
    // Fetch EVERY page: the deals table proves payout_ratio over ALL eligible deals,
    // so a single page (BE max_page_size = 100) would understate the totals/ratio when
    // a distribution has more deals than one page.
    const pageSize = 100
    const results: EligibleDeal[] = []
    let page = 1
    for (;;) {
      const resp = await this.get(ApiPaths.accounting_promotion_distributions_deals_list, {
        path: { id },
        query: { page, page_size: pageSize },
      })
      const pageRows = resp?.results ?? []
      results.push(...pageRows)
      if (!resp?.next || pageRows.length === 0) break
      page += 1
    }
    return { results }
  }
}

let _service: PromotionDistributionService | null = null

export function getPromotionDistributionService(): PromotionDistributionService {
  if (!_service) _service = new PromotionDistributionService()
  return _service
}

export function usePromotionDistributions(
  params?: GetPromotionDistributionsParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.PROMOTION_DISTRIBUTIONS.LIST(params || {}),
    () => getPromotionDistributionService().getPromotionDistributions(params),
    { enabled: options?.enabled ?? true, staleTime: 1000 * 60 * 5 }
  )
}

export function usePromotionDistribution(id: number, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.PROMOTION_DISTRIBUTIONS.DETAIL(id),
    () => getPromotionDistributionService().getPromotionDistribution(id),
    { enabled: !!id && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useCreatePromotionDistribution() {
  return useApiMutation((data: ProjectPromotionDistributionInputRequest) =>
    getPromotionDistributionService().createPromotionDistribution(data)
  )
}

export function useUpdatePromotionDistribution() {
  return useApiMutation((variables: { id: number; data: ProjectPromotionDistributionRequest }) =>
    getPromotionDistributionService().updatePromotionDistribution(variables.id, variables.data)
  )
}

export function usePartialUpdatePromotionDistribution() {
  return useApiMutation(
    (variables: { id: number; data: PatchedProjectPromotionDistributionInputRequest }) =>
      getPromotionDistributionService().partialUpdatePromotionDistribution(
        variables.id,
        variables.data
      )
  )
}

export function useDeletePromotionDistribution() {
  return useApiMutation((id: number) =>
    getPromotionDistributionService().deletePromotionDistribution(id)
  )
}

export function useConfirmPromotionDistribution() {
  return useApiMutation((variables: { id: number; data: ProjectPromotionDistributionRequest }) =>
    getPromotionDistributionService().confirmPromotionDistribution(variables.id, variables.data)
  )
}

export function useReopenPromotionDistribution() {
  return useApiMutation((variables: { id: number; data: ProjectPromotionDistributionRequest }) =>
    getPromotionDistributionService().reopenPromotionDistribution(variables.id, variables.data)
  )
}

export function useVoidPromotionDistribution() {
  return useApiMutation(
    (variables: { id: number; data: ProjectPromotionDistributionVoidRequest }) =>
      getPromotionDistributionService().voidPromotionDistribution(variables.id, variables.data)
  )
}

export function useBulkDraftPromotionDistributions() {
  return useApiMutation((data: BulkDraftInputRequest) =>
    getPromotionDistributionService().bulkDraftPromotionDistributions(data)
  )
}

export function usePreviewPromotionDistribution() {
  return useApiMutation((data: ProjectPromotionDistributionInputRequest) =>
    getPromotionDistributionService().previewPromotionDistribution(data)
  )
}

export function usePromotionDistributionDepartmentAllocations(
  id: number,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.PROMOTION_DISTRIBUTIONS.DEPARTMENT_ALLOCATIONS(id),
    () => getPromotionDistributionService().getDepartmentAllocationsPromotionDistribution(id),
    { enabled: !!id && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function usePromotionDistributionDeals(id: number, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.PROMOTION_DISTRIBUTIONS.DEALS(id),
    () => getPromotionDistributionService().getDealsPromotionDistribution(id),
    { enabled: !!id && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

// Department-allocation split & import-lines endpoints are not available in the
// current backend schema; their service methods/hooks were removed accordingly.
