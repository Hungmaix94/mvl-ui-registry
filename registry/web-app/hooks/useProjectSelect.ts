import { useCallback, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import type {
  LoadOptionsParams,
  LoadOptionsResult,
  SelectOption,
} from '@/components/ui/select/Select'
import { QUERY_KEYS } from '@/constants'
import type { GetProjectsDropdownParams } from '@/services/realestate-service'
import { getRealEstateService } from '@/services/realestate-service'

/**
 * Paginated project dropdown for Select (React Query cache + API-native filters).
 */
export function useProjectSelect(options: GetProjectsDropdownParams = {}) {
  const queryClient = useQueryClient()
  const optionsRef = useRef(options)
  optionsRef.current = options

  const loadProjectOptions = useCallback(
    async (params: LoadOptionsParams): Promise<LoadOptionsResult<SelectOption>> => {
      try {
        const currentOptions = optionsRef.current
        const sourceExchangeId = Number(currentOptions.source_exchange)

        if (currentOptions.source_exchange != null && sourceExchangeId <= 0) {
          return { items: [], nextPage: null, hasNextPage: false }
        }

        const apiParams: GetProjectsDropdownParams = {
          page: params.page,
          page_size: params.pageSize,
          ...currentOptions,
        }

        if (params.query) {
          apiParams.search = params.query
        }

        const queryKey = QUERY_KEYS.REALESTATE.PROJECTS.DROPDOWN(
          apiParams as Record<string, unknown>
        )
        const paginatedData = await queryClient.fetchQuery({
          queryKey,
          queryFn: () => getRealEstateService().getProjectDropdown(apiParams),
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

        const items: SelectOption[] = paginatedData.results.map((r) => ({
          value: r.id,
          label: `${r.code} - ${r.name}`,
        }))

        return { items, nextPage, hasNextPage: hasNext }
      } catch (error) {
        console.error('Error loading project options:', error)
        return { items: [], nextPage: null, hasNextPage: false }
      }
    },
    [queryClient]
  )

  const loadInitialProjectOptions = useCallback(
    async (values: (string | number)[]): Promise<SelectOption[]> => {
      if (!values?.length) return []
      try {
        const results = await Promise.all(
          values.map(async (raw) => {
            const id = Number(raw)
            try {
              const detail = await queryClient.fetchQuery({
                queryKey: QUERY_KEYS.REALESTATE.PROJECTS.DETAIL(id),
                queryFn: () => getRealEstateService().getProject(id),
                staleTime: 1000 * 60 * 5,
              })
              return {
                label: `${detail.code} - ${detail.name}`,
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

  return { loadProjectOptions, loadInitialProjectOptions }
}
