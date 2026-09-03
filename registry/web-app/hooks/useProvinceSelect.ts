import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { getProvinceService, GetProvincesParams, Province } from '@/services/province-service'
import { QUERY_KEYS } from '@/constants'
import type {
  LoadOptionsParams,
  LoadOptionsResult,
  SelectOption,
} from '../ui/select/Select.tsx'

type UseProvinceSelectOptions = {
  pageSize?: number
}

export function useProvinceSelect(options: UseProvinceSelectOptions = {}) {
  const { pageSize = 100 } = options // Load all provinces at once (only 63 provinces in Vietnam)

  const queryClient = useQueryClient()

  const loadProvinceOptions = useCallback(
    async (params: LoadOptionsParams): Promise<LoadOptionsResult<SelectOption>> => {
      if (!params) {
        return {
          items: [],
          hasNextPage: false,
          nextPage: null,
        }
      }

      try {
        // Provinces API doesn't support pagination params, so we load all and paginate client-side
        // Build API params (only search if provided)
        const apiParams: GetProvincesParams = params.query
          ? {
              search: params.query,
            }
          : undefined

        // Use React Query to fetch and cache the data
        const queryKey = QUERY_KEYS.PROVINCES.LIST(apiParams || {})
        const response = await queryClient.fetchQuery({
          queryKey,
          queryFn: () => getProvinceService().getProvinces(apiParams),
          staleTime: 1000 * 60 * 30, // 30 minutes cache
        })

        // Handle both array and paginated response
        // getProvinces type says Province[] but actually returns paginated data
        let paginatedData: any
        if (Array.isArray(response)) {
          // If it's an array, convert to paginated format
          paginatedData = {
            results: response.slice(
              (params.page - 1) * (params.pageSize || pageSize),
              params.page * (params.pageSize || pageSize)
            ),
            count: response.length,
            next:
              params.page * (params.pageSize || pageSize) < response.length
                ? `?page=${params.page + 1}`
                : null,
            previous: params.page > 1 ? `?page=${params.page - 1}` : null,
          }
        } else {
          paginatedData = response
        }

        if (!paginatedData || !paginatedData.results) {
          console.warn('No results in provinces API response:', paginatedData)
          return {
            items: [],
            hasNextPage: false,
            nextPage: null,
          }
        }

        // Parse next page number from next URL
        let nextPage: number | null = null
        const hasNext = !!paginatedData.next

        if (hasNext && paginatedData.next) {
          try {
            const nextUrl = paginatedData.next.startsWith('http')
              ? new URL(paginatedData.next)
              : new URL(paginatedData.next, window.location.origin)
            const nextPageParam = nextUrl.searchParams.get('page')
            if (nextPageParam) {
              nextPage = Number(nextPageParam)
            }
          } catch (error) {
            const pageMatch = paginatedData.next.match(/[?&]page=(\d+)/)
            if (pageMatch) {
              nextPage = Number(pageMatch[1])
            } else {
              nextPage = params.page + 1
            }
          }
        }

        // Map provinces to SelectOption format
        const items: SelectOption[] = paginatedData.results.map((province: Province) => ({
          label: province.name,
          value: province.id,
        }))

        return {
          items,
          hasNextPage: hasNext,
          nextPage,
        }
      } catch (error) {
        console.error('Error loading province options:', error)
        return {
          items: [],
          hasNextPage: false,
          nextPage: null,
        }
      }
    },
    [pageSize, queryClient]
  )

  const loadInitialProvinceOptions = useCallback(
    async (values: (string | number)[]): Promise<SelectOption[]> => {
      if (!values || values.length === 0) {
        return []
      }

      try {
        // Fetch by ID using getProvince endpoint
        const fetchPromises = values.map(async (id) => {
          try {
            const province = await queryClient.fetchQuery({
              queryKey: QUERY_KEYS.PROVINCES.DETAIL(Number(id)),
              queryFn: () => getProvinceService().getProvince(Number(id)),
              staleTime: 1000 * 60 * 30, // 30 minutes cache
            })

            if (province) {
              return {
                label: province.name,
                value: province.id,
              } as SelectOption
            }

            return {
              label: String(id),
              value: id,
            } as SelectOption
          } catch (error) {
            console.error(`Error fetching province ${id}:`, error)
            return {
              label: String(id),
              value: id,
            } as SelectOption
          }
        })

        const results = await Promise.all(fetchPromises)
        return results
      } catch (error) {
        console.error('Error loading initial province options:', error)
        return values.map((value) => ({
          label: String(value),
          value,
        })) as SelectOption[]
      }
    },
    [queryClient]
  )

  return {
    loadProvinceOptions,
    loadInitialProvinceOptions,
  }
}
