import { useCallback, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import type {
  GetProductInventoriesDropdownParams,
  ProductInventoryDropdown,
} from '@/services/realestate-service'
import { getRealEstateService } from '@/services/realestate-service'
import { QUERY_KEYS } from '@/constants'
import { PAGE_SIZE } from '../constants/table.ts'
import type {
  LoadOptionsParams,
  LoadOptionsResult,
  SelectOption,
} from '../ui/select/Select.tsx'

type UseProductInventorySelectOptions = {
  pageSize?: number
  additionalParams?:
    | GetProductInventoriesDropdownParams
    | (() => GetProductInventoriesDropdownParams)
}

export function useProductInventorySelect(options: UseProductInventorySelectOptions = {}) {
  const { pageSize = PAGE_SIZE, additionalParams } = options

  const queryClient = useQueryClient()
  const dropdownCacheRef = useRef<Map<number, ProductInventoryDropdown>>(new Map())

  const loadProductInventoryOptions = useCallback(
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

        const apiParams: GetProductInventoriesDropdownParams = {
          page: params.page,
          page_size: params.pageSize || pageSize,
          ...resolvedAdditionalParams,
        }

        if (params.query) {
          apiParams.search = params.query
        }

        const queryKey = QUERY_KEYS.REALESTATE.PRODUCT_INVENTORIES.DROPDOWN(
          apiParams as Record<string, unknown>
        )
        const paginatedData = await queryClient.fetchQuery({
          queryKey,
          queryFn: () => getRealEstateService().getProductInventoryDropdown(apiParams),
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

        paginatedData.results.forEach((row: ProductInventoryDropdown) => {
          dropdownCacheRef.current.set(row.id, row)
        })

        const items: SelectOption[] = paginatedData.results.map(
          (row: ProductInventoryDropdown) => ({
            label: `${row.code} - ${row.unit_number}`,
            value: String(row.id),
          })
        )

        return {
          items,
          hasNextPage: hasNext,
          nextPage,
        }
      } catch (error) {
        console.error('Error loading product inventory options:', error)
        return {
          items: [],
          hasNextPage: false,
          nextPage: null,
        }
      }
    },
    [additionalParams, pageSize, queryClient]
  )

  const loadInitialProductInventoryOptions = useCallback(
    async (values: (string | number)[]): Promise<SelectOption[]> => {
      if (!values || values.length === 0) {
        return []
      }

      try {
        const fetchPromises = values.map(async (raw) => {
          const id = Number(raw)
          try {
            const detailData = await queryClient.fetchQuery({
              queryKey: QUERY_KEYS.REALESTATE.PRODUCT_INVENTORIES.DETAIL(id),
              queryFn: () => getRealEstateService().getProductInventory(id),
              staleTime: 1000 * 60 * 5,
            })

            if (detailData) {
              return {
                label: `${detailData.code} - ${detailData.unit_number}`,
                value: String(detailData.id),
              } as SelectOption
            }
          } catch {
            // fall through
          }

          const cached = dropdownCacheRef.current.get(id)
          if (cached) {
            return {
              label: `${cached.code} - ${cached.unit_number}`,
              value: String(cached.id),
            } as SelectOption
          }

          return {
            label: String(id),
            value: String(id),
          } as SelectOption
        })

        return await Promise.all(fetchPromises)
      } catch (error) {
        console.error('Error loading initial product inventory options:', error)
        return values.map((value) => ({
          label: String(value),
          value: String(value),
        })) as SelectOption[]
      }
    },
    [queryClient]
  )

  return {
    loadProductInventoryOptions,
    loadInitialProductInventoryOptions,
  }
}
