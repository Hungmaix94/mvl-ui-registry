import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  getRecruitmentRequestService,
  type GetRecruitmentRequestsDropdownParams,
  type RecruitmentRequestDropdown,
} from '@/features/recruitment/services/recruitment-request-service'
import { QUERY_KEYS } from '@/constants'
import { PAGE_SIZE } from '../constants/table.ts'
import type {
  LoadOptionsParams,
  LoadOptionsResult,
  SelectOption,
} from '../ui/select/Select.tsx'

type UseRecruitmentRequestSelectOptions = {
  pageSize?: number
  additionalParams?:
    | GetRecruitmentRequestsDropdownParams
    | (() => GetRecruitmentRequestsDropdownParams)
}

function formatRecruitmentRequestLabel(req: RecruitmentRequestDropdown): string {
  return req.code && req.name ? `${req.code} - ${req.name}` : (req.name ?? String(req.id))
}

export function useRecruitmentRequestSelect(options: UseRecruitmentRequestSelectOptions = {}) {
  const { pageSize = PAGE_SIZE, additionalParams } = options

  const queryClient = useQueryClient()

  const loadRecruitmentRequestOptions = useCallback(
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

        const apiParams: GetRecruitmentRequestsDropdownParams = {
          page: params.page,
          page_size: params.pageSize || pageSize,
          ...resolvedAdditionalParams,
        }

        if (params.query) {
          apiParams.search = params.query
        }

        const queryKey = QUERY_KEYS.HRM.RECRUITMENT_REQUESTS.DROPDOWN(apiParams)
        const paginatedData = await queryClient.fetchQuery({
          queryKey,
          queryFn: () => getRecruitmentRequestService().getRecruitmentRequestsDropdown(apiParams),
          staleTime: 1000 * 60 * 5, // 5 minutes cache
        })

        if (!paginatedData || !paginatedData.results) {
          console.warn('No results in recruitment requests API response:', paginatedData)
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

        const items: SelectOption[] = paginatedData.results.map(
          (req: RecruitmentRequestDropdown) => ({
            label: formatRecruitmentRequestLabel(req),
            value: req.id,
          })
        )

        return {
          items,
          hasNextPage: hasNext,
          nextPage,
        }
      } catch (error) {
        console.error('Error loading recruitment request options:', error)
        return {
          items: [],
          hasNextPage: false,
          nextPage: null,
        }
      }
    },
    [pageSize, additionalParams, queryClient]
  )

  const loadInitialRecruitmentRequestOptions = useCallback(
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

        const apiParams: GetRecruitmentRequestsDropdownParams = {
          id__in: ids,
          ...resolvedAdditionalParams,
        }

        const queryKey = QUERY_KEYS.HRM.RECRUITMENT_REQUESTS.DROPDOWN(apiParams)
        const response = await queryClient.fetchQuery({
          queryKey,
          queryFn: () => getRecruitmentRequestService().getRecruitmentRequestsDropdown(apiParams),
          staleTime: 1000 * 60 * 5, // 5 minutes cache
        })

        if (!response?.results?.length) {
          return ids.map((id) => ({ label: String(id), value: id })) as SelectOption[]
        }

        const resultMap = new Map<number, RecruitmentRequestDropdown>()
        for (const r of response.results) {
          resultMap.set(r.id, r)
        }

        return ids.map((id) => {
          const req = resultMap.get(id)
          return req
            ? { label: formatRecruitmentRequestLabel(req), value: req.id }
            : { label: String(id), value: id }
        }) as SelectOption[]
      } catch (error) {
        console.error('Error loading initial recruitment request options:', error)
        return values.map((value) => ({
          label: String(value),
          value,
        })) as SelectOption[]
      }
    },
    [additionalParams, queryClient]
  )

  return {
    loadRecruitmentRequestOptions,
    loadInitialRecruitmentRequestOptions,
  }
}
