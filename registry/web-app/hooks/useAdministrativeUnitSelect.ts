import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  getAdministrativeUnitService,
  GetAdministrativeUnitsParams,
  AdministrativeUnit,
} from '@/services/administrative-unit-service'
import { QUERY_KEYS } from '@/constants'
import { PAGE_SIZE } from '../constants/table.ts'
import type {
  LoadOptionsParams,
  LoadOptionsResult,
  SelectOption,
} from '../ui/select/Select.tsx'

type UseAdministrativeUnitSelectOptions = {
  parentProvince?: number | null
  pageSize?: number
}

export function useAdministrativeUnitSelect(options: UseAdministrativeUnitSelectOptions = {}) {
  const { parentProvince, pageSize = PAGE_SIZE } = options

  const queryClient = useQueryClient()

  const loadAdministrativeUnitOptions = useCallback(
    async (params: LoadOptionsParams): Promise<LoadOptionsResult<SelectOption>> => {
      if (!params) {
        return {
          items: [],
          hasNextPage: false,
          nextPage: null,
        }
      }

      // If parentProvince is required but not provided, return empty
      if (parentProvince === undefined || parentProvince === null) {
        return {
          items: [],
          hasNextPage: false,
          nextPage: null,
        }
      }

      try {
        // Build API params
        const apiParams: GetAdministrativeUnitsParams = {
          page: params.page,
          page_size: params.pageSize || pageSize,
          parent_province: parentProvince,
        }

        // Add search query if provided
        if (params.query) {
          apiParams.search = params.query
        }

        // Use React Query to fetch and cache the data
        const queryKey = QUERY_KEYS.ADMINISTRATIVE_UNITS.LIST(apiParams)
        const paginatedData = await queryClient.fetchQuery({
          queryKey,
          queryFn: () => getAdministrativeUnitService().getAdministrativeUnits(apiParams),
          staleTime: 1000 * 60 * 30, // 30 minutes cache
        })

        if (!paginatedData || !paginatedData.results) {
          console.warn('No results in administrative units API response:', paginatedData)
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

        // Map administrative units to SelectOption format
        const items: SelectOption[] = paginatedData.results.map((unit: AdministrativeUnit) => ({
          label: unit.name,
          value: unit.id,
        }))

        return {
          items,
          hasNextPage: hasNext,
          nextPage,
        }
      } catch (error) {
        console.error('Error loading administrative unit options:', error)
        return {
          items: [],
          hasNextPage: false,
          nextPage: null,
        }
      }
    },
    [parentProvince, pageSize, queryClient]
  )

  const loadInitialAdministrativeUnitOptions = useCallback(
    async (values: (string | number)[]): Promise<SelectOption[]> => {
      if (
        !values ||
        values.length === 0 ||
        parentProvince === undefined ||
        parentProvince === null
      ) {
        return []
      }

      try {
        // Fetch by ID using getAdministrativeUnit endpoint
        const fetchPromises = values.map(async (id) => {
          try {
            const unit = await queryClient.fetchQuery({
              queryKey: QUERY_KEYS.ADMINISTRATIVE_UNITS.DETAIL(Number(id)),
              queryFn: () => getAdministrativeUnitService().getAdministrativeUnit(Number(id)),
              staleTime: 1000 * 60 * 30, // 30 minutes cache
            })

            if (unit) {
              return {
                label: unit.name,
                value: unit.id,
              } as SelectOption
            }

            return {
              label: String(id),
              value: id,
            } as SelectOption
          } catch (error) {
            console.error(`Error fetching administrative unit ${id}:`, error)
            return {
              label: String(id),
              value: id,
            } as SelectOption
          }
        })

        const results = await Promise.all(fetchPromises)
        return results
      } catch (error) {
        console.error('Error loading initial administrative unit options:', error)
        return values.map((value) => ({
          label: String(value),
          value,
        })) as SelectOption[]
      }
    },
    [parentProvince, queryClient]
  )

  return {
    loadAdministrativeUnitOptions,
    loadInitialAdministrativeUnitOptions,
  }
}
