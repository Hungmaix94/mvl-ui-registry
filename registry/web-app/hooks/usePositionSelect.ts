import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  getPositionService,
  type GetPositionsDropdownParams,
  type PositionDropdown,
} from '@/features/org/services/position-service'
import { QUERY_KEYS } from '@/constants'
import { PAGE_SIZE } from '../constants/table.ts'
import type {
  LoadOptionsParams,
  LoadOptionsResult,
  SelectOption,
} from '../ui/select/Select.tsx'

type UsePositionSelectOptions = {
  pageSize?: number
  additionalParams?: GetPositionsDropdownParams | (() => GetPositionsDropdownParams)
}

export function usePositionSelect(options: UsePositionSelectOptions = {}) {
  const { pageSize = PAGE_SIZE, additionalParams } = options
  const queryClient = useQueryClient()

  const loadPositionOptions = useCallback(
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

        const apiParams: GetPositionsDropdownParams = {
          page: params.page,
          page_size: params.pageSize || pageSize,
          ...resolvedAdditionalParams,
        }

        if (params.query) {
          apiParams.search = params.query
        }

        const queryKey = QUERY_KEYS.HRM.POSITIONS.DROPDOWN(apiParams)
        const paginatedData = await queryClient.fetchQuery({
          queryKey,
          queryFn: () => getPositionService().getPositionsDropdown(apiParams),
          staleTime: 1000 * 60 * 10, // 10 minutes cache
        })

        if (!paginatedData || !paginatedData.results) {
          console.warn('No results in positions API response:', paginatedData)
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

        const items: SelectOption[] = paginatedData.results.map((pos: PositionDropdown) => ({
          label: pos.name,
          value: pos.id,
        }))

        return {
          items,
          hasNextPage: hasNext,
          nextPage,
        }
      } catch (error) {
        console.error('Error loading position options:', error)
        return {
          items: [],
          hasNextPage: false,
          nextPage: null,
        }
      }
    },
    [additionalParams, pageSize, queryClient]
  )

  const loadInitialPositionOptions = useCallback(
    async (values: (string | number)[]): Promise<SelectOption[]> => {
      if (!values || values.length === 0) {
        return []
      }

      try {
        const resolvedAdditionalParams =
          typeof additionalParams === 'function' ? additionalParams() : additionalParams || {}

        const ids = Array.from(
          new Set(values.map((v) => Number(v)).filter((id) => !Number.isNaN(id) && id > 0))
        )
        if (!ids.length) {
          return values.map((v) => ({ label: String(v), value: v })) as SelectOption[]
        }

        const apiParams: GetPositionsDropdownParams = {
          id__in: ids.map(Number),
          ...resolvedAdditionalParams,
        }

        const queryKey = QUERY_KEYS.HRM.POSITIONS.DROPDOWN(apiParams)
        const response = await queryClient.fetchQuery({
          queryKey,
          queryFn: () => getPositionService().getPositionsDropdown(apiParams),
          staleTime: 1000 * 60 * 10, // 10 minutes cache
        })

        if (!response?.results?.length) {
          return ids.map((id) => ({ label: String(id), value: id })) as SelectOption[]
        }

        const resultMap = new Map<number, PositionDropdown>()
        for (const p of response.results) {
          resultMap.set(p.id, p)
        }

        return ids.map((id) => {
          const pos = resultMap.get(id)
          return pos ? { label: pos.name, value: pos.id } : { label: String(id), value: id }
        }) as SelectOption[]
      } catch (error) {
        console.error('Error loading initial position options:', error)
        return values.map((value) => ({
          label: String(value),
          value,
        })) as SelectOption[]
      }
    },
    [additionalParams, queryClient]
  )

  return {
    loadPositionOptions,
    loadInitialPositionOptions,
  }
}
