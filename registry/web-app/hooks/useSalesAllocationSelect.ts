import { useCallback, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  getRealEstateService,
  type GetSalesAllocationsDropdownParams,
  type SalesAllocationDropdown,
} from '@/services/realestate-service'
import { QUERY_KEYS } from '@/constants'
import { PAGE_SIZE } from '../constants/table.ts'
import { formatCodeNameLabel } from '@/utils/string-utils'
import type {
  LoadOptionsParams,
  LoadOptionsResult,
  SelectOption,
} from '../ui/select/Select.tsx'

type UseSalesAllocationSelectOptions = {
  valueType?: 'id' | 'code'
  pageSize?: number
  additionalParams?: GetSalesAllocationsDropdownParams | (() => GetSalesAllocationsDropdownParams)
}

export function useSalesAllocationSelect(options: UseSalesAllocationSelectOptions = {}) {
  const { valueType = 'id', pageSize = PAGE_SIZE, additionalParams } = options

  const queryClient = useQueryClient()
  const dropdownCacheRef = useRef<Map<number, SalesAllocationDropdown>>(new Map())

  const getCachedSalesAllocationById = useCallback(
    (id: number): SalesAllocationDropdown | undefined => {
      return dropdownCacheRef.current.get(id)
    },
    []
  )

  const loadSalesAllocationOptions = useCallback(
    async (params: LoadOptionsParams): Promise<LoadOptionsResult<SelectOption>> => {
      if (!params) {
        return {
          items: [],
          hasNextPage: false,
          nextPage: null,
        }
      }

      try {
        const resolvedAdditionalParams =
          typeof additionalParams === 'function' ? additionalParams() : additionalParams || {}

        const apiParams: GetSalesAllocationsDropdownParams = {
          page: params.page,
          page_size: params.pageSize || pageSize,
          ...resolvedAdditionalParams,
        }

        if (params.query) {
          apiParams.search = params.query
        }

        const queryKey = QUERY_KEYS.REALESTATE.SALES_ALLOCATIONS.DROPDOWN(apiParams)
        const paginatedData = await queryClient.fetchQuery({
          queryKey,
          queryFn: () => getRealEstateService().getSalesAllocationsDropdown(apiParams),
          staleTime: 1000 * 60 * 5, // 5 minutes cache
        })

        if (!paginatedData || !paginatedData.results) {
          return {
            items: [],
            hasNextPage: false,
            nextPage: null,
          }
        }

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

        paginatedData.results.forEach((sa: SalesAllocationDropdown) => {
          dropdownCacheRef.current.set(sa.id, sa)
        })

        const items: SelectOption[] = paginatedData.results.map((sa: SalesAllocationDropdown) => {
          const value = valueType === 'code' ? String(sa.code) : String(sa.id)
          const label = formatCodeNameLabel(sa.code, sa.name, String(sa.id))
          return {
            label,
            value,
          }
        })

        return {
          items,
          hasNextPage: hasNext,
          nextPage,
        }
      } catch (error) {
        console.error('Error loading sales allocation options:', error)
        return {
          items: [],
          hasNextPage: false,
          nextPage: null,
        }
      }
    },
    [valueType, pageSize, additionalParams, queryClient]
  )

  const loadInitialSalesAllocationOptions = useCallback(
    async (values: (string | number)[]): Promise<SelectOption[]> => {
      if (!values || values.length === 0) {
        return []
      }

      try {
        if (valueType === 'code') {
          const fetchPromises = values.map(async (code) => {
            const apiParams: GetSalesAllocationsDropdownParams = {
              search: String(code),
              page: 1,
              page_size: 1,
            }

            const queryKey = QUERY_KEYS.REALESTATE.SALES_ALLOCATIONS.DROPDOWN(apiParams)
            const paginatedData = await queryClient.fetchQuery({
              queryKey,
              queryFn: () => getRealEstateService().getSalesAllocationsDropdown(apiParams),
              staleTime: 1000 * 60 * 5,
            })

            if (paginatedData?.results && paginatedData.results.length > 0) {
              const sa = paginatedData.results[0]
              if (sa.code && sa.code.toLowerCase() === String(code).toLowerCase()) {
                dropdownCacheRef.current.set(sa.id, sa)
                return {
                  label: formatCodeNameLabel(sa.code, sa.name, String(sa.id)),
                  value: String(sa.code),
                } as SelectOption
              }
            }
            return null
          })

          const results = await Promise.all(fetchPromises)
          return results.filter((item): item is SelectOption => item !== null)
        } else {
          try {
            const ids = values.map(Number).filter(Boolean)
            const apiParams: GetSalesAllocationsDropdownParams = {
              id__in: ids,
              page_size: ids.length || 1,
            }
            const queryKey = QUERY_KEYS.REALESTATE.SALES_ALLOCATIONS.DROPDOWN(apiParams)
            const paginatedData = await queryClient.fetchQuery({
              queryKey,
              queryFn: () => getRealEstateService().getSalesAllocationsDropdown(apiParams),
              staleTime: 1000 * 60 * 5,
            })

            return (
              paginatedData?.results?.map((sa) => {
                dropdownCacheRef.current.set(sa.id, sa)
                return {
                  label: formatCodeNameLabel(sa.code, sa.name, String(sa.id)),
                  value: String(sa.id),
                } as SelectOption
              }) ?? []
            )
          } catch (error) {
            console.error('Error fetching initial sales allocations by id__in:', error)
            return values.map((value) => ({ label: String(value), value: String(value) }))
          }
        }
      } catch (error) {
        console.error('Error loading initial sales allocation options:', error)
        return values.map((value) => ({
          label: String(value),
          value: String(value),
        })) as SelectOption[]
      }
    },
    [valueType, queryClient]
  )

  return {
    loadSalesAllocationOptions,
    loadInitialSalesAllocationOptions,
    getCachedSalesAllocationById,
  }
}
