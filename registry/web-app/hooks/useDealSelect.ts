import { useCallback } from 'react'

import type {
  LoadOptionsParams,
  LoadOptionsResult,
  SelectOption,
} from '@/components/ui/select/Select'
import { getDealService } from '@/features/sales/deals/services/deal-service'
import { PAGE_SIZE } from '@/constants/table'

export function useDealSelect(options: { projectId?: number } = {}) {
  const projectId = options.projectId

  const loadDealOptions = useCallback(
    async (params: LoadOptionsParams): Promise<LoadOptionsResult<SelectOption>> => {
      try {
        const paginatedData = await getDealService().getDeals({
          page: params.page,
          page_size: params.pageSize || PAGE_SIZE,
          search: params.query || undefined,
          project: projectId || undefined,
        })

        if (!paginatedData?.results) {
          return { items: [], nextPage: null, hasNextPage: false }
        }

        const items: SelectOption[] = paginatedData.results.map((deal) => {
          const unit = deal.product_inventory?.unit_number || deal.product_inventory?.code || ''
          const project = deal.project?.name || deal.project?.code || ''
          const label =
            projectId && unit
              ? `${unit} (${deal.code})`
              : unit && project
                ? `${unit} - ${project} (${deal.code})`
                : deal.code
          return {
            value: deal.id,
            label,
          }
        })

        let nextPage: number | null = null
        const hasNext = !!paginatedData.next
        if (hasNext && paginatedData.next) {
          try {
            const nextUrl = paginatedData.next.startsWith('http')
              ? new URL(paginatedData.next)
              : new URL(paginatedData.next, window.location.origin)
            const nextPageParam = nextUrl.searchParams.get('page')
            if (nextPageParam) nextPage = Number(nextPageParam)
          } catch {
            const pageMatch = paginatedData.next.match(/[?&]page=(\d+)/)
            if (pageMatch) {
              nextPage = Number(pageMatch[1])
            } else {
              nextPage = params.page + 1
            }
          }
        }

        return { items, nextPage, hasNextPage: hasNext }
      } catch {
        return { items: [], nextPage: null, hasNextPage: false }
      }
    },
    [projectId]
  )

  const loadInitialDealOptions = useCallback(async (values: (string | number)[]) => {
    if (!values?.length) return []
    try {
      const results = await Promise.all(
        values.map(async (raw) => {
          const id = Number(raw)
          const deal = await getDealService().getDealWorkspace(id)
          const pi = deal.overview?.pi
          const unit = pi?.unit_number || pi?.code || ''
          const label = unit
            ? `${unit} (${deal.header?.deal_code || String(id)})`
            : deal.header?.deal_code || String(id)
          return {
            value: id,
            label,
          } as SelectOption
        })
      )
      return results
    } catch {
      return values.map((v) => ({ value: v, label: String(v) }))
    }
  }, [])

  return { loadDealOptions, loadInitialDealOptions }
}
