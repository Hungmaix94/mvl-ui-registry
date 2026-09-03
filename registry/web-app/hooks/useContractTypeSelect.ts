import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  getContractTypeService,
  type GetContractTypesParams,
} from '@/features/contract/services/contract-type-service'
import { QUERY_KEYS } from '@/constants'
import { PAGE_SIZE } from '@/constants/table.ts'
import type {
  LoadOptionsParams,
  LoadOptionsResult,
  SelectOption,
} from '@/components/ui/select/Select.tsx'
import type { components } from '@/api/schema'

type ContractTypeListItem = components['schemas']['ContractTypeList']

type UseContractTypeSelectOptions = {
  pageSize?: number
  additionalParams?: GetContractTypesParams | (() => GetContractTypesParams)
}

export function useContractTypeSelect(options: UseContractTypeSelectOptions = {}) {
  const { pageSize = PAGE_SIZE, additionalParams } = options

  const queryClient = useQueryClient()

  const loadContractTypeOptions = useCallback(
    async (params: LoadOptionsParams): Promise<LoadOptionsResult<SelectOption>> => {
      if (!params) {
        return {
          items: [],
          hasNextPage: false,
          nextPage: null,
        }
      }

      try {
        // Get additional params (can be function or object)
        const resolvedAdditionalParams =
          typeof additionalParams === 'function' ? additionalParams() : additionalParams || {}

        // Build API params for contract types query
        const apiParams: GetContractTypesParams = {
          page: params.page,
          page_size: params.pageSize || pageSize,
          ...resolvedAdditionalParams,
        }

        // Add search query if provided (merge with additionalParams.search if exists)
        if (params.query) {
          apiParams.search = params.query
        }

        // Use React Query to fetch and cache the data
        const queryKey = QUERY_KEYS.HRM.CONTRACT_TYPES.LIST(apiParams)
        const paginatedData = await queryClient.fetchQuery({
          queryKey,
          queryFn: () => getContractTypeService().getContractTypes(apiParams),
          staleTime: 1000 * 60 * 5, // 5 minutes cache
        })

        // getPaginated returns TPaginatedData directly: { count, next, previous, results }
        if (!paginatedData || !paginatedData.results) {
          console.warn('No results in contract types API response:', paginatedData)
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
            // Handle both absolute and relative URLs
            const nextUrl = paginatedData.next.startsWith('http')
              ? new URL(paginatedData.next)
              : new URL(paginatedData.next, window.location.origin)
            const nextPageParam = nextUrl.searchParams.get('page')
            if (nextPageParam) {
              nextPage = Number(nextPageParam)
            }
          } catch (error) {
            // If URL parsing fails, try to extract page from query string manually
            const pageMatch = paginatedData.next.match(/[?&]page=(\d+)/)
            if (pageMatch) {
              nextPage = Number(pageMatch[1])
            } else {
              // Fallback: increment current page if parsing fails
              nextPage = params.page + 1
            }
          }
        }

        // Map contract types to SelectOption format
        const items: SelectOption[] = paginatedData.results.map(
          (contractType: ContractTypeListItem) => {
            return {
              label: contractType.name || '',
              value: contractType.id,
            }
          }
        )

        return {
          items,
          hasNextPage: hasNext,
          nextPage,
        }
      } catch (error) {
        console.error('Error loading contract type options:', error)
        return {
          items: [],
          hasNextPage: false,
          nextPage: null,
        }
      }
    },
    [pageSize, additionalParams, queryClient]
  )

  const loadInitialContractTypeOptions = useCallback(
    async (values: (string | number)[]): Promise<SelectOption[]> => {
      if (!values || values.length === 0) {
        return []
      }

      try {
        // Fetch by ID using getContractType endpoint
        const fetchPromises = values.map(async (id) => {
          try {
            const contractType = await queryClient.fetchQuery({
              queryKey: QUERY_KEYS.HRM.CONTRACT_TYPES.DETAIL(Number(id)),
              queryFn: () => getContractTypeService().getContractType(Number(id)),
              staleTime: 1000 * 60 * 5, // 5 minutes cache
            })

            if (contractType) {
              return {
                label: contractType.name || '',
                value: contractType.id,
              } as SelectOption
            }

            // If not found, return a fallback option with just the ID
            return {
              label: String(id),
              value: Number(id),
            } as SelectOption
          } catch (error) {
            console.error(`Error fetching contract type ${id}:`, error)
            // Return fallback option
            return {
              label: String(id),
              value: Number(id),
            } as SelectOption
          }
        })

        // Wait for all promises to resolve
        const results = await Promise.all(fetchPromises)
        return results
      } catch (error) {
        console.error('Error loading initial contract type options:', error)
        // Return fallback options
        return values.map((value) => ({
          label: String(value),
          value: Number(value),
        })) as SelectOption[]
      }
    },
    [queryClient]
  )

  return {
    loadContractTypeOptions,
    loadInitialContractTypeOptions,
  }
}
