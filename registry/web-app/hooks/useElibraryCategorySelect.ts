import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { getElibraryService, type GetElibraryCategoriesParams } from '@/services/elibrary-service'
import { QUERY_KEYS } from '@/constants'
import type {
  LoadOptionsParams,
  LoadOptionsResult,
  SelectOption,
} from '../ui/select/Select'
import { PAGE_SIZE } from '../constants/table'

type UseElibraryCategorySelectOptions = {
  pageSize?: number
  additionalParams?: GetElibraryCategoriesParams | (() => GetElibraryCategoriesParams)
  /**
   * Provide a label map to display selected values immediately
   * even when the dropdown options haven't loaded yet.
   */
  initialLabelById?: Record<number, string | undefined>
}

export function useElibraryCategorySelect(options: UseElibraryCategorySelectOptions = {}) {
  const { pageSize = PAGE_SIZE, additionalParams, initialLabelById } = options
  const queryClient = useQueryClient()

  const loadCategoryOptions = useCallback(
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

        const apiParams: GetElibraryCategoriesParams = {
          page: params.page,
          page_size: params.pageSize || pageSize,
          ...(resolvedAdditionalParams as GetElibraryCategoriesParams),
        }

        if (params.query) {
          ;(apiParams as { search?: string }).search = params.query
        }

        const queryKey = QUERY_KEYS.ELIBRARY.CATEGORIES.LIST(
          apiParams as unknown as Record<string, unknown>
        )
        const response = await queryClient.fetchQuery({
          queryKey,
          queryFn: () => getElibraryService().getCategories(apiParams),
          staleTime: 1000 * 60 * 10,
        })

        const results =
          (response as { results?: Array<{ id: number; name?: string | null }> | null })?.results ??
          []

        let nextPage: number | null = null
        const next = (response as { next?: string | null })?.next
        const hasNext = !!next
        if (hasNext && next) {
          try {
            const nextUrl = next.startsWith('http')
              ? new URL(next)
              : new URL(next, window.location.origin)
            const nextPageParam = nextUrl.searchParams.get('page')
            if (nextPageParam) {
              nextPage = Number(nextPageParam)
            }
          } catch {
            const pageMatch = next.match(/[?&]page=(\d+)/)
            nextPage = pageMatch ? Number(pageMatch[1]) : params.page + 1
          }
        }

        const items: SelectOption[] = results.map((cat) => ({
          label: cat.name ?? String(cat.id),
          value: cat.id,
        }))

        return {
          items,
          hasNextPage: hasNext,
          nextPage,
        }
      } catch {
        return {
          items: [],
          hasNextPage: false,
          nextPage: null,
        }
      }
    },
    [additionalParams, pageSize, queryClient]
  )

  const loadInitialCategoryOptions = useCallback(
    async (values: (string | number)[]): Promise<SelectOption[]> => {
      if (!values || values.length === 0) return []

      try {
        const ids = Array.from(
          new Set(values.map((v) => Number(v)).filter((id) => !Number.isNaN(id) && id > 0))
        )
        if (!ids.length) return []

        const resolvedAdditionalParams =
          typeof additionalParams === 'function' ? additionalParams() : additionalParams || {}

        const apiParams: GetElibraryCategoriesParams = {
          ...(resolvedAdditionalParams as GetElibraryCategoriesParams),
          ...({ id__in: ids } as unknown as GetElibraryCategoriesParams),
          page_size: Math.max(ids.length, 1),
        }

        const queryKey = QUERY_KEYS.ELIBRARY.CATEGORIES.LIST(
          apiParams as unknown as Record<string, unknown>
        )
        const response = await queryClient.fetchQuery({
          queryKey,
          queryFn: () => getElibraryService().getCategories(apiParams),
          staleTime: 1000 * 60 * 10,
        })

        const results =
          (response as { results?: Array<{ id: number; name?: string | null }> | null })?.results ??
          []
        const resultMap = new Map<number, { id: number; name?: string | null }>()
        for (const r of results) {
          resultMap.set(r.id, r)
        }

        return ids.map((id) => {
          const category = resultMap.get(id)
          const fallbackLabel = initialLabelById?.[id]
          return category
            ? { label: category.name ?? String(category.id), value: category.id }
            : { label: fallbackLabel ?? String(id), value: id }
        })
      } catch {
        return values.map((value) => {
          const id = Number(value)
          return {
            label:
              (!Number.isNaN(id) && id > 0 ? initialLabelById?.[id] : undefined) ?? String(value),
            value: value as any,
          }
        })
      }
    },
    [additionalParams, initialLabelById, queryClient]
  )

  return {
    loadCategoryOptions,
    loadInitialCategoryOptions,
  }
}
