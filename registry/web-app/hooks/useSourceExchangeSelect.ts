import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import type {
  LoadOptionsParams,
  LoadOptionsResult,
  SelectOption,
} from '@/components/ui/select/Select'
import { QUERY_KEYS } from '@/constants'
import { PAGE_SIZE } from '@/constants/table'
import type { GetSourceExchangesDropdownParams } from '@/services/realestate-service'
import { getRealEstateService } from '@/services/realestate-service'

type UseSourceExchangeSelectOptions = {
  pageSize?: number
  /** Lọc theo dự án (query `project` trên API dropdown). */
  project?: number
}

export function useSourceExchangeSelect(options: UseSourceExchangeSelectOptions = {}) {
  const { pageSize = PAGE_SIZE, project } = options
  const queryClient = useQueryClient()

  const loadSourceExchangeOptions = useCallback(
    async (params: LoadOptionsParams): Promise<LoadOptionsResult<SelectOption>> => {
      try {
        const apiParams: GetSourceExchangesDropdownParams = {
          page: params.page,
          page_size: params.pageSize || pageSize,
        }

        if (project != null && project > 0) {
          apiParams.project = project
        }

        if (params.query) {
          apiParams.search = params.query
        }

        const queryKey = QUERY_KEYS.REALESTATE.SOURCE_EXCHANGES.DROPDOWN(
          apiParams as Record<string, unknown>
        )
        const paginatedData = await queryClient.fetchQuery({
          queryKey,
          queryFn: () => getRealEstateService().getSourceExchangeDropdown(apiParams),
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

        const items: SelectOption[] = paginatedData.results.map((sourceExchange) => ({
          label:
            sourceExchange.code || sourceExchange.name
              ? `${sourceExchange.code} - ${sourceExchange.name}`
              : `${sourceExchange.id}`,
          value: sourceExchange.id,
        }))

        return { items, nextPage, hasNextPage: hasNext }
      } catch {
        return { items: [], nextPage: null, hasNextPage: false }
      }
    },
    [pageSize, project, queryClient]
  )

  const loadInitialSourceExchangeOptions = useCallback(
    async (values: (string | number)[]): Promise<SelectOption[]> => {
      if (!values?.length) return []

      try {
        const results = await Promise.all(
          values.map(async (raw) => {
            const id = Number(raw)
            try {
              const detail = await queryClient.fetchQuery({
                queryKey: QUERY_KEYS.REALESTATE.SOURCE_EXCHANGES.DETAIL(id),
                queryFn: () => getRealEstateService().getSourceExchange(id),
                staleTime: 1000 * 60 * 5,
              })

              return {
                label:
                  detail.code || detail.name ? `${detail.code} - ${detail.name}` : `${detail.id}`,
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
    [queryClient]
  )

  return {
    loadSourceExchangeOptions,
    loadInitialSourceExchangeOptions,
  }
}
