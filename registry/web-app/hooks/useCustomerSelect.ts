import { useCallback, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  getSaleService,
  type GetCustomerDropdownParams,
  type CustomerDropdown,
} from '@/services/sales-service'
import { QUERY_KEYS } from '@/constants'
import { PAGE_SIZE } from '../constants/table.ts'
import type {
  LoadOptionsParams,
  LoadOptionsResult,
  SelectOption,
} from '../ui/select/Select.tsx'

function formatCustomerOption(cust: any, valueType: string, customerType?: string): SelectOption {
  const custType = cust.customer_type || customerType || 'individual'
  const identifier =
    custType === 'business'
      ? cust.business_tax_code || cust.id_number || cust.code || '---'
      : cust.id_number || cust.code || '---'
  const name =
    custType === 'business'
      ? cust.business_name || cust.full_name?.trim() || cust.name || ''
      : cust.full_name?.trim() || cust.name || ''

  const value =
    valueType === 'id_number'
      ? String(identifier !== '---' ? identifier : cust.id)
      : String(cust.id)
  const label = `${identifier} - ${name}`

  return { label, value }
}

type UseCustomerSelectOptions = {
  valueType?: 'id' | 'id_number'
  pageSize?: number
  additionalParams?: GetCustomerDropdownParams | (() => GetCustomerDropdownParams)
  customerType?: 'individual' | 'business'
}

export function useCustomerSelect(options: UseCustomerSelectOptions = {}) {
  const { valueType = 'id', pageSize = PAGE_SIZE, additionalParams, customerType } = options

  const queryClient = useQueryClient()
  const dropdownCacheRef = useRef<Map<number, CustomerDropdown>>(new Map())

  const getCachedCustomerById = useCallback((id: number): CustomerDropdown | undefined => {
    return dropdownCacheRef.current.get(id)
  }, [])

  const loadCustomerOptions = useCallback(
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

        const apiParams: GetCustomerDropdownParams = {
          page: params.page,
          page_size: params.pageSize || pageSize,
          ...resolvedAdditionalParams,
        }

        if (params.query) {
          apiParams.search = params.query
        }

        const queryKey = QUERY_KEYS.SALES.CUSTOMERS.DROPDOWN(apiParams as Record<string, unknown>)
        const paginatedData = await queryClient.fetchQuery({
          queryKey,
          queryFn: () => getSaleService().getCustomerDropdown(apiParams),
          staleTime: 1000 * 60 * 5,
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
          } catch {
            const pageMatch = paginatedData.next.match(/[?&]page=(\d+)/)
            if (pageMatch) {
              nextPage = Number(pageMatch[1])
            } else {
              nextPage = params.page + 1
            }
          }
        }

        paginatedData.results.forEach((cust: CustomerDropdown) => {
          dropdownCacheRef.current.set(cust.id, cust)
        })

        const items: SelectOption[] = paginatedData.results.map((cust: any) =>
          formatCustomerOption(cust, valueType, customerType)
        )

        return {
          items,
          hasNextPage: hasNext,
          nextPage,
        }
      } catch (error) {
        console.error('Error loading customer options:', error)
        return {
          items: [],
          hasNextPage: false,
          nextPage: null,
        }
      }
    },
    [valueType, pageSize, additionalParams, queryClient]
  )

  const loadInitialCustomerOptions = useCallback(
    async (values: (string | number)[]): Promise<SelectOption[]> => {
      if (!values || values.length === 0) {
        return []
      }

      try {
        if (valueType === 'id_number') {
          const fetchPromises = values.map(async (idNumber) => {
            const apiParams: GetCustomerDropdownParams = {
              search: String(idNumber),
              page: 1,
              page_size: 1,
            }

            const paginatedData = await queryClient.fetchQuery({
              queryKey: QUERY_KEYS.SALES.CUSTOMERS.DROPDOWN(apiParams as Record<string, unknown>),
              queryFn: () => getSaleService().getCustomerDropdown(apiParams),
              staleTime: 1000 * 60 * 5,
            })

            if (paginatedData?.results && paginatedData.results.length > 0) {
              const cust = paginatedData.results[0] as any
              if (cust.id_number === String(idNumber)) {
                dropdownCacheRef.current.set(cust.id, cust)
                return formatCustomerOption(cust, valueType, customerType)
              }
            }
            return null
          })

          const results = await Promise.all(fetchPromises)
          return results.filter((item): item is SelectOption => item !== null)
        } else {
          const resolvedAdditionalParams =
            typeof additionalParams === 'function' ? additionalParams() : additionalParams || {}
          const { customer_type, ...initialApiParams } = resolvedAdditionalParams as any
          const fetchPromises = values.map(async (id) => {
            try {
              const apiParams: GetCustomerDropdownParams = {
                id__in: [Number(id)],
                page: 1,
                page_size: 1,
                ...initialApiParams,
              }
              const paginatedData = await queryClient.fetchQuery({
                queryKey: QUERY_KEYS.SALES.CUSTOMERS.DROPDOWN(apiParams as Record<string, unknown>),
                queryFn: () => getSaleService().getCustomerDropdown(apiParams),
                staleTime: 1000 * 60 * 5,
              })

              const cust = paginatedData?.results?.[0]
              if (cust) {
                dropdownCacheRef.current.set(cust.id, cust)
                return formatCustomerOption(cust, valueType, customerType)
              }

              return {
                label: String(id),
                value: String(id),
              } as SelectOption
            } catch (error) {
              return {
                label: String(id),
                value: String(id),
              } as SelectOption
            }
          })

          const results = await Promise.all(fetchPromises)
          return results
        }
      } catch (error) {
        return values.map((value) => ({
          label: String(value),
          value: String(value),
        })) as SelectOption[]
      }
    },
    [valueType, queryClient]
  )

  return {
    loadCustomerOptions,
    loadInitialCustomerOptions,
    getCachedCustomerById,
  }
}
