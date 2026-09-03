import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  getRecruitmentSourceService,
  type GetRecruitmentSourcesDropdownParams,
  type RecruitmentSourceDropdown,
} from '@/features/recruitment/services/recruitment-source-service'
import { QUERY_KEYS } from '@/constants'
import { PAGE_SIZE } from '@/constants/table.ts'
import type {
  LoadOptionsParams,
  LoadOptionsResult,
  SelectOption,
} from '@/components/ui/select/Select.tsx'

type UseRecruitmentSourceSelectOptions = {
  pageSize?: number
  additionalParams?:
    | GetRecruitmentSourcesDropdownParams
    | (() => GetRecruitmentSourcesDropdownParams)
  excludeCodes?: string[]
}

export function useRecruitmentSourceSelect(options: UseRecruitmentSourceSelectOptions = {}) {
  const { pageSize = PAGE_SIZE, additionalParams, excludeCodes = [] } = options

  const queryClient = useQueryClient()

  const loadRecruitmentSourceOptions = useCallback(
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

        const apiParams: GetRecruitmentSourcesDropdownParams = {
          page: params.page,
          page_size: params.pageSize || pageSize,
          ...resolvedAdditionalParams,
        }

        if (params.query) {
          apiParams.search = params.query
        }

        const queryKey = QUERY_KEYS.HRM.RECRUITMENT_SOURCES.DROPDOWN(apiParams)
        const paginatedData = await queryClient.fetchQuery({
          queryKey,
          queryFn: () => getRecruitmentSourceService().getRecruitmentSourcesDropdown(apiParams),
          staleTime: 1000 * 60 * 5, // 5 minutes cache
        })

        if (!paginatedData || !paginatedData.results) {
          console.warn('No results in recruitment sources API response:', paginatedData)
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

        const items: SelectOption[] = paginatedData.results
          .filter((source: RecruitmentSourceDropdown) => !excludeCodes.includes(source.code))
          .map((source: RecruitmentSourceDropdown) => ({
            label: source.name,
            value: source.id,
          }))

        return {
          items,
          hasNextPage: hasNext,
          nextPage,
        }
      } catch (error) {
        console.error('Error loading recruitment source options:', error)
        return {
          items: [],
          hasNextPage: false,
          nextPage: null,
        }
      }
    },
    [pageSize, additionalParams, excludeCodes, queryClient]
  )

  const loadInitialRecruitmentSourceOptions = useCallback(
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

        const apiParams: GetRecruitmentSourcesDropdownParams = {
          id__in: ids,
          ...resolvedAdditionalParams,
        }

        const queryKey = QUERY_KEYS.HRM.RECRUITMENT_SOURCES.DROPDOWN(apiParams)
        const response = await queryClient.fetchQuery({
          queryKey,
          queryFn: () => getRecruitmentSourceService().getRecruitmentSourcesDropdown(apiParams),
          staleTime: 1000 * 60 * 5, // 5 minutes cache
        })

        if (!response?.results?.length) {
          return ids.map((id) => ({ label: String(id), value: id })) as SelectOption[]
        }

        const resultMap = new Map<number, RecruitmentSourceDropdown>()
        for (const s of response.results) {
          resultMap.set(s.id, s)
        }

        return ids
          .filter((id) => {
            const source = resultMap.get(id)
            return !source || !excludeCodes.includes(source.code)
          })
          .map((id) => {
            const source = resultMap.get(id)
            return source
              ? { label: source.name, value: source.id }
              : { label: String(id), value: id }
          }) as SelectOption[]
      } catch (error) {
        console.error('Error loading initial recruitment source options:', error)
        return values.map((value) => ({
          label: String(value),
          value,
        })) as SelectOption[]
      }
    },
    [additionalParams, excludeCodes, queryClient]
  )

  return {
    loadRecruitmentSourceOptions,
    loadInitialRecruitmentSourceOptions,
  }
}
