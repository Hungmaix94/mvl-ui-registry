import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  getBlockService,
  type GetBlocksDropdownParams,
  type BlockDropdown,
} from '@/features/org/services/block-service'
import { QUERY_KEYS } from '@/constants'
import type {
  LoadOptionsParams,
  LoadOptionsResult,
  SelectOption,
} from '../ui/select/Select.tsx'
import { PAGE_SIZE } from '../constants/table'

type UseBlockSelectOptions = {
  pageSize?: number
  additionalParams?: GetBlocksDropdownParams | (() => GetBlocksDropdownParams)
}

export function useBlockSelect(options: UseBlockSelectOptions = {}) {
  const { pageSize = PAGE_SIZE, additionalParams } = options

  const queryClient = useQueryClient()

  const loadBlockOptions = useCallback(
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

        const apiParams: GetBlocksDropdownParams = {
          page: params.page,
          page_size: params.pageSize || pageSize,
          ...resolvedAdditionalParams,
        }

        if (params.query) {
          apiParams.search = params.query
        }

        const queryKey = QUERY_KEYS.HRM.BLOCKS.DROPDOWN(apiParams)
        const response = await queryClient.fetchQuery({
          queryKey,
          queryFn: () => getBlockService().getBlocksDropdown(apiParams),
          staleTime: 1000 * 60 * 10,
        })

        if (!response || !response.results) {
          console.warn('No results in blocks API response:', response)
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

        const items: SelectOption[] = response.results.map((block: BlockDropdown) => ({
          label: block.name,
          value: String(block.id),
        }))

        return {
          items,
          hasNextPage: hasNext,
          nextPage,
        }
      } catch (error) {
        console.error('Error loading block options:', error)
        return {
          items: [],
          hasNextPage: false,
          nextPage: null,
        }
      }
    },
    [pageSize, additionalParams, queryClient]
  )

  const loadInitialBlockOptions = useCallback(
    async (values: (string | number)[]): Promise<SelectOption[]> => {
      if (!values || values.length === 0) {
        return []
      }

      try {
        const ids = Array.from(
          new Set(values.map((v) => Number(v)).filter((id) => !Number.isNaN(id) && id > 0))
        )
        if (!ids.length) return []

        const resolvedAdditionalParams =
          typeof additionalParams === 'function' ? additionalParams() : additionalParams || {}

        const apiParams: GetBlocksDropdownParams = {
          id__in: ids.map(Number),
          ...resolvedAdditionalParams,
        }

        const queryKey = QUERY_KEYS.HRM.BLOCKS.DROPDOWN(apiParams)
        const response = await queryClient.fetchQuery({
          queryKey,
          queryFn: () => getBlockService().getBlocksDropdown(apiParams),
          staleTime: 1000 * 60 * 10,
        })

        if (!response?.results?.length) {
          return ids.map((id) => ({ label: String(id), value: String(id) })) as SelectOption[]
        }

        const resultMap = new Map<number, BlockDropdown>()
        for (const b of response.results) {
          resultMap.set(b.id, b)
        }

        return ids.map((id) => {
          const block = resultMap.get(id)
          return block
            ? { label: block.name, value: String(block.id) }
            : { label: String(id), value: String(id) }
        }) as SelectOption[]
      } catch (error) {
        console.error('Error loading initial block options:', error)
        return values.map((value) => ({
          label: String(value),
          value: String(value),
        })) as SelectOption[]
      }
    },
    [additionalParams, queryClient]
  )

  return {
    loadBlockOptions,
    loadInitialBlockOptions,
  }
}
