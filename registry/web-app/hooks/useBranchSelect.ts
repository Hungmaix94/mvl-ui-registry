import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  getBranchService,
  type GetBranchesDropdownParams,
  type BranchDropdown,
} from '@/features/org/services/branch-service'
import { QUERY_KEYS } from '@/constants'
import type {
  LoadOptionsParams,
  LoadOptionsResult,
  SelectOption,
} from '@/components/ui/select/Select.tsx'
import { PAGE_SIZE } from '@/constants/table'

type UseBranchSelectOptions = {
  pageSize?: number
}

export function useBranchSelect(options: UseBranchSelectOptions = {}) {
  const { pageSize = PAGE_SIZE } = options

  const queryClient = useQueryClient()

  const loadBranchOptions = useCallback(
    async (params: LoadOptionsParams): Promise<LoadOptionsResult<SelectOption>> => {
      if (!params) {
        return {
          items: [],
          hasNextPage: false,
          nextPage: null,
        }
      }

      try {
        const apiParams: GetBranchesDropdownParams = {
          page: params.page,
          page_size: params.pageSize || pageSize,
        }

        if (params.query) {
          apiParams.search = params.query
        }

        const queryKey = QUERY_KEYS.HRM.BRANCHES.DROPDOWN(apiParams)
        const response = await queryClient.fetchQuery({
          queryKey,
          queryFn: () => getBranchService().getBranchesDropdown(apiParams),
          staleTime: 1000 * 60 * 10, // 10 minutes cache
        })

        if (!response || !response.results) {
          console.warn('No results in branches API response:', response)
          return {
            items: [],
            hasNextPage: false,
            nextPage: null,
          }
        }

        let nextPage: number | null = null
        const hasNext = !!response.next

        if (hasNext && response.next) {
          try {
            const nextUrl = response.next.startsWith('http')
              ? new URL(response.next)
              : new URL(response.next, window.location.origin)
            const nextPageParam = nextUrl.searchParams.get('page')
            if (nextPageParam) {
              nextPage = Number(nextPageParam)
            }
          } catch (error) {
            const pageMatch = response.next.match(/[?&]page=(\d+)/)
            if (pageMatch) {
              nextPage = Number(pageMatch[1])
            } else {
              nextPage = params.page + 1
            }
          }
        }

        const items: SelectOption[] = response.results.map((branch: BranchDropdown) => ({
          label: branch.name,
          value: String(branch.id),
        }))

        return {
          items,
          hasNextPage: hasNext,
          nextPage,
        }
      } catch (error) {
        console.error('Error loading branch options:', error)
        return {
          items: [],
          hasNextPage: false,
          nextPage: null,
        }
      }
    },
    [pageSize, queryClient]
  )

  const loadInitialBranchOptions = useCallback(
    async (values: (string | number)[]): Promise<SelectOption[]> => {
      if (!values || values.length === 0) {
        return []
      }

      try {
        const ids = Array.from(
          new Set(values.map((v) => Number(v)).filter((id) => !Number.isNaN(id) && id > 0))
        )
        if (!ids.length) return []

        const apiParams: GetBranchesDropdownParams = { id__in: ids.map(Number) }
        const queryKey = QUERY_KEYS.HRM.BRANCHES.DROPDOWN(apiParams)
        const response = await queryClient.fetchQuery({
          queryKey,
          queryFn: () => getBranchService().getBranchesDropdown(apiParams),
          staleTime: 1000 * 60 * 10, // 10 minutes cache
        })

        if (!response?.results?.length) {
          return ids.map((id) => ({ label: String(id), value: String(id) })) as SelectOption[]
        }

        const resultMap = new Map<number, BranchDropdown>()
        for (const b of response.results) {
          resultMap.set(b.id, b)
        }

        return ids.map((id) => {
          const branch = resultMap.get(id)
          return branch
            ? { label: branch.name, value: String(branch.id) }
            : { label: String(id), value: String(id) }
        }) as SelectOption[]
      } catch (error) {
        console.error('Error loading initial branch options:', error)
        return values.map((value) => ({
          label: String(value),
          value: String(value),
        })) as SelectOption[]
      }
    },
    [queryClient]
  )

  return {
    loadBranchOptions,
    loadInitialBranchOptions,
  }
}
