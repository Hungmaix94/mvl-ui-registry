import { useCallback, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  getRealEstateService,
  type GetInvestorsDropdownParams,
  type InvestorDropdown,
} from '@/services/realestate-service'
import { QUERY_KEYS } from '@/constants'
import { PAGE_SIZE } from '../constants/table.ts'
import type {
  LoadOptionsParams,
  LoadOptionsResult,
  SelectOption,
} from '../ui/select/Select.tsx'
import { buildInvestorLabel } from '@/features/investor/_shares/utils/investor-option.ts'

type UseInvestorSelectOptions = {
  valueType?: 'id' | 'code'
  fields?: string[]
  pageSize?: number
  additionalParams?: GetInvestorsDropdownParams | (() => GetInvestorsDropdownParams)
}

export function useInvestorSelect(options: UseInvestorSelectOptions = {}) {
  const {
    valueType = 'id',
    fields = ['code', 'id', 'name'],
    pageSize = PAGE_SIZE,
    additionalParams,
  } = options

  const queryClient = useQueryClient()
  const dropdownCacheRef = useRef<Map<number, InvestorDropdown>>(new Map())

  const getCachedInvestorById = useCallback((id: number): InvestorDropdown | undefined => {
    return dropdownCacheRef.current.get(id)
  }, [])

  const loadInvestorOptions = useCallback(
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

        // Build API params for investors dropdown query
        const apiParams: GetInvestorsDropdownParams = {
          page: params.page,
          page_size: params.pageSize || pageSize,
          ...resolvedAdditionalParams,
        }

        // Add search query if provided
        if (params.query) {
          apiParams.search = params.query
        }

        // Use React Query to fetch and cache the data
        const queryKey = QUERY_KEYS.REALESTATE.INVESTORS.DROPDOWN(apiParams)
        const paginatedData = await queryClient.fetchQuery({
          queryKey,
          queryFn: () => getRealEstateService().getInvestorDropdown(apiParams),
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

        // Cache full InvestorDropdown by id
        paginatedData.results.forEach((inv: InvestorDropdown) => {
          dropdownCacheRef.current.set(inv.id, inv)
        })

        const items: SelectOption[] = paginatedData.results.map((inv: InvestorDropdown) => {
          const value = valueType === 'code' ? String(inv.code) : String(inv.id)
          const label = buildInvestorLabel(inv)
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
        console.error('Error loading investor options:', error)
        return {
          items: [],
          hasNextPage: false,
          nextPage: null,
        }
      }
    },
    [valueType, fields, pageSize, additionalParams, queryClient]
  )

  const loadInitialInvestorOptions = useCallback(
    async (values: (string | number)[]): Promise<SelectOption[]> => {
      if (!values || values.length === 0) {
        return []
      }

      try {
        if (valueType === 'code') {
          // Fetch by code
          const fetchPromises = values.map(async (code) => {
            const apiParams: GetInvestorsDropdownParams = {
              search: String(code),
              page: 1,
              page_size: 1,
            }

            const queryKey = QUERY_KEYS.REALESTATE.INVESTORS.DROPDOWN(apiParams)
            const paginatedData = await queryClient.fetchQuery({
              queryKey,
              queryFn: () => getRealEstateService().getInvestorDropdown(apiParams),
              staleTime: 1000 * 60 * 5,
            })

            if (paginatedData?.results && paginatedData.results.length > 0) {
              const inv = paginatedData.results[0]
              if (inv.code && inv.code.toLowerCase() === String(code).toLowerCase()) {
                dropdownCacheRef.current.set(inv.id, inv)
                return {
                  label: buildInvestorLabel(inv),
                  value: String(inv.code),
                } as SelectOption
              }
            }
            return null
          })

          const results = await Promise.all(fetchPromises)
          return results.filter((item): item is SelectOption => item !== null)
        } else {
          // Use id__in batch query — 1 request instead of N detail requests
          try {
            const ids = values.map(Number).filter(Boolean)
            const apiParams: GetInvestorsDropdownParams = {
              id__in: ids,
              page_size: ids.length || 1,
            }
            const queryKey = QUERY_KEYS.REALESTATE.INVESTORS.DROPDOWN(apiParams)
            const paginatedData = await queryClient.fetchQuery({
              queryKey,
              queryFn: () => getRealEstateService().getInvestorDropdown(apiParams),
              staleTime: 1000 * 60 * 5,
            })

            return (
              paginatedData?.results?.map((inv) => {
                dropdownCacheRef.current.set(inv.id, inv)
                return {
                  label: buildInvestorLabel(inv),
                  value: String(inv.id),
                } as SelectOption
              }) ?? []
            )
          } catch (error) {
            console.error('Error fetching initial investors by id__in:', error)
            return values.map((value) => ({ label: String(value), value: String(value) }))
          }
        }
      } catch (error) {
        console.error('Error loading initial investor options:', error)
        return values.map((value) => ({
          label: String(value),
          value: String(value),
        })) as SelectOption[]
      }
    },
    [valueType, fields, queryClient]
  )

  return {
    loadInvestorOptions,
    loadInitialInvestorOptions,
    getCachedInvestorById,
  }
}
