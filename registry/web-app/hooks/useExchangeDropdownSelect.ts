import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import type {
  LoadOptionsParams,
  LoadOptionsResult,
  SelectOption,
} from '../ui/select/Select'
import { QUERY_KEYS } from '@/constants'
import { PAGE_SIZE } from '../constants/table'
import type { GetExchangesDropdownParams } from '@/services/realestate-service'
import { getRealEstateService } from '@/services/realestate-service'

export function useExchangeDropdownSelect() {
  const queryClient = useQueryClient()

  const loadExchangeDropdownOptions = useCallback(
    async (params: LoadOptionsParams): Promise<LoadOptionsResult<SelectOption>> => {
      if (!params) {
        return { items: [], hasNextPage: false, nextPage: null }
      }

      try {
        const apiParams: GetExchangesDropdownParams = {
          page: params.page,
          page_size: params.pageSize || PAGE_SIZE,
        }
        if (params.query) {
          apiParams.search = params.query
        }

        const queryKey = QUERY_KEYS.REALESTATE.EXCHANGES.DROPDOWN(
          apiParams as Record<string, unknown>
        )
        const paginatedData = await queryClient.fetchQuery({
          queryKey,
          queryFn: () => getRealEstateService().getExchangeDropdown(apiParams),
          staleTime: 1000 * 60 * 5,
        })

        if (!paginatedData?.results) {
          return { items: [], hasNextPage: false, nextPage: null }
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

        const items: SelectOption[] = paginatedData.results.map((ex) => ({
          label: `${ex.code} - ${ex.name}`,
          value: ex.id,
        }))

        return { items, hasNextPage: hasNext, nextPage }
      } catch (error) {
        console.error('Error loading exchange dropdown:', error)
        return { items: [], hasNextPage: false, nextPage: null }
      }
    },
    [queryClient]
  )

  const loadInitialExchangeDropdownOptions = useCallback(
    async (values: (string | number)[]): Promise<SelectOption[]> => {
      if (!values?.length) return []
      try {
        const results = await Promise.all(
          values.map(async (raw) => {
            const id = Number(raw)
            const ex = await queryClient.fetchQuery({
              queryKey: QUERY_KEYS.REALESTATE.EXCHANGES.DETAIL(id),
              queryFn: () => getRealEstateService().getExchange(id),
              staleTime: 1000 * 60 * 5,
            })
            return {
              label: `${ex.code} - ${ex.name}`,
              value: ex.id,
            } as SelectOption
          })
        )
        return results
      } catch {
        return values.map((value) => ({ label: String(value), value: Number(value) || value }))
      }
    },
    [queryClient]
  )

  return {
    loadExchangeDropdownOptions,
    loadInitialExchangeDropdownOptions,
  }
}
