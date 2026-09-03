import { useCallback, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import type {
  LoadOptionsParams,
  LoadOptionsResult,
  SelectOption,
} from '@/components/ui/select/Select'
import { QUERY_KEYS } from '@/constants'
import { PAGE_SIZE } from '@/constants/table'
import type { GetSalesAllocationsDropdownParams } from '@/services/realestate-service'
import { getRealEstateService } from '@/services/realestate-service'
import { formatCodeNameLabel } from '@/utils/string-utils'

/**
 * Paginated sales-allocation dropdown for Select (React Query cache).
 *
 * A SalesAllocation carries two independent FKs — `project` and `source_exchange` —
 * so both scopes are optional and either narrows the list. Returns empty only when
 * NEITHER is set; otherwise sends whichever scope(s) are provided.
 */
export function useSalesAllocationsDropdownSelect(options: GetSalesAllocationsDropdownParams = {}) {
  const queryClient = useQueryClient()
  const optionsRef = useRef(options)
  optionsRef.current = options

  const loadSalesAllocationsDropdownOptions = useCallback(
    async (params: LoadOptionsParams): Promise<LoadOptionsResult<SelectOption>> => {
      try {
        const currentOptions = optionsRef.current
        const exchange = Number(currentOptions.exchange)
        const project = Number(currentOptions.project)
        const hasExchange = Number.isFinite(exchange) && exchange > 0
        const hasProject = Number.isFinite(project) && project > 0
        // project and source_exchange are independent scopes on a SalesAllocation:
        // load once AT LEAST ONE is set, and send only the scope(s) provided.
        if (!hasExchange && !hasProject) {
          return { items: [], nextPage: null, hasNextPage: false }
        }

        const apiParams: GetSalesAllocationsDropdownParams = {
          page: params.page,
          page_size: params.pageSize || PAGE_SIZE,
        }
        if (hasProject) apiParams.project = project
        if (hasExchange) apiParams.exchange = exchange

        if (params.query) {
          apiParams.search = params.query
        }

        const queryKey = QUERY_KEYS.REALESTATE.SALES_ALLOCATIONS.DROPDOWN(
          apiParams as Record<string, unknown>
        )
        const paginatedData = await queryClient.fetchQuery({
          queryKey,
          queryFn: () => getRealEstateService().getSalesAllocationsDropdown(apiParams),
          staleTime: 1000 * 60 * 5,
        })

        if (!paginatedData?.results) {
          return { items: [], nextPage: null, hasNextPage: false }
        }

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

        const items: SelectOption[] = paginatedData.results.map(
          (row: { id: number; name?: string; code?: string }) => ({
            label: formatCodeNameLabel(row.code, row.name, `Thông tin bán hàng #${row.id}`),
            value: row.id,
          })
        )

        return { items, nextPage, hasNextPage: hasNext }
      } catch (error) {
        console.error('Error loading sales allocation dropdown options:', error)
        return { items: [], nextPage: null, hasNextPage: false }
      }
    },
    [queryClient]
  )

  const loadInitialSalesAllocationsDropdownOptions = useCallback(
    async (values: (string | number)[]): Promise<SelectOption[]> => {
      if (!values?.length) return []
      try {
        const results = await Promise.all(
          values.map(async (raw) => {
            const id = Number(raw)
            try {
              const detail = await getRealEstateService().getSalesAllocation(id)
              return {
                label: formatCodeNameLabel(
                  detail.code,
                  detail.name,
                  `Thông tin bán hàng #${detail.id}`
                ),
                value: detail.id,
              } as SelectOption
            } catch {
              return { label: String(id), value: id } as SelectOption
            }
          })
        )
        return results
      } catch {
        return []
      }
    },
    []
  )

  return {
    loadSalesAllocationsDropdownOptions,
    loadInitialSalesAllocationsDropdownOptions,
  }
}
