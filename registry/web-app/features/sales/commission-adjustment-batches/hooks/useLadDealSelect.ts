import { useCallback } from 'react'
import type {
  LoadOptionsParams,
  LoadOptionsResult,
  SelectOption,
} from '@/components/ui/select/Select'
import { getDealService } from '@/features/sales/deals/services/deal-service'
import { PAGE_SIZE } from '@/constants/table'
import { DealStatus } from '@/constants/api-schema-aliases'

export interface UseLadDealSelectArgs {
  /** Host SA — scopes the deal dropdown via getDeals({ sales_allocation }). 0 ⇒ no fetch. */
  saleAllocationId: number
  /** Optional narrower scope from the Step-1 filter bar. */
  productInventoryId?: number | null
  /** rate_determination_date range (yyyy-MM-dd). */
  dateFrom?: string | null
  dateTo?: string | null
}

function parseNextPage(next: string | null | undefined, currentPage: number): number | null {
  if (!next) return null
  const match = next.match(/[?&]page=(\d+)/)
  return match ? Number(match[1]) : currentPage + 1
}

/**
 * Async-paginated deal Select source for Bước 1 "thêm GD tay". The Select VALUE is `deal.id`
 * (= LadLineCreateRequestRequest.deal_id); the label is "mã HĐ · mã căn". Deals are scoped to the
 * host SA (+ optional PI / date range). Mirrors {@link useReconDealSelect} but simpler — Step 1
 * renders server line data, so no per-deal cache is needed here.
 */
export function useLadDealSelect({
  saleAllocationId,
  productInventoryId,
  dateFrom,
  dateTo,
}: UseLadDealSelectArgs) {
  const loadDealOptions = useCallback(
    async (params: LoadOptionsParams): Promise<LoadOptionsResult<SelectOption>> => {
      if (!saleAllocationId) return { items: [], nextPage: null, hasNextPage: false }

      const data = await getDealService().getDeals({
        page: params.page,
        page_size: params.pageSize || PAGE_SIZE,
        search: params.query || undefined,
        sales_allocation: saleAllocationId,
        product_inventory: productInventoryId || undefined,
        rate_determination_date_from: dateFrom || undefined,
        rate_determination_date_to: dateTo || undefined,
        status: DealStatus.active,
      })

      const results = data?.results ?? []
      const items: SelectOption[] = results.map((deal) => {
        const canCode = deal.product_inventory?.unit_number || deal.product_inventory?.code || ''
        return {
          value: deal.id,
          label: [deal.code, canCode].filter(Boolean).join(' · '),
        }
      })
      const next = parseNextPage(data?.next, params.page)
      return { items, nextPage: next, hasNextPage: !!data?.next }
    },
    [saleAllocationId, productInventoryId, dateFrom, dateTo]
  )

  return { loadDealOptions }
}

export default useLadDealSelect
