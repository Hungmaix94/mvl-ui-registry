import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  getJobDescriptionService,
  type GetJobDescriptionsParams,
  type JobDescription,
} from '@/features/recruitment/services/job-description-service'
import { QUERY_KEYS } from '@/constants'
import { PAGE_SIZE } from '../constants/table.ts'
import type {
  LoadOptionsParams,
  LoadOptionsResult,
  SelectOption,
} from '../ui/select/Select.tsx'

type UseJobDescriptionSelectOptions = {
  pageSize?: number
  additionalParams?: GetJobDescriptionsParams | (() => GetJobDescriptionsParams)
}

export function useJobDescriptionSelect(options: UseJobDescriptionSelectOptions = {}) {
  const { pageSize = PAGE_SIZE, additionalParams } = options

  const queryClient = useQueryClient()

  const loadJobDescriptionOptions = useCallback(
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

        // Build API params
        const apiParams: GetJobDescriptionsParams = {
          page: params.page,
          page_size: params.pageSize || pageSize,
          ordering: 'code', // Default ordering
          ...resolvedAdditionalParams,
        }

        // Add search query if provided
        if (params.query) {
          apiParams.search = params.query
        }

        // Use React Query to fetch and cache the data
        const queryKey = QUERY_KEYS.HRM.JOB_DESCRIPTIONS.LIST(apiParams)
        const paginatedData = await queryClient.fetchQuery({
          queryKey,
          queryFn: () => getJobDescriptionService().getJobDescriptions(apiParams),
          staleTime: 1000 * 60 * 5, // 5 minutes cache
        })

        if (!paginatedData || !paginatedData.results) {
          console.warn('No results in job descriptions API response:', paginatedData)
          return {
            items: [],
            hasNextPage: false,
            nextPage: null,
          }
        }

        // Parse next page number from next URL
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

        // Map job descriptions to SelectOption format
        const items: SelectOption[] = paginatedData.results.map((jd: JobDescription) => ({
          label: jd.title,
          value: jd.id,
        }))

        return {
          items,
          hasNextPage: hasNext,
          nextPage,
        }
      } catch (error) {
        console.error('Error loading job description options:', error)
        return {
          items: [],
          hasNextPage: false,
          nextPage: null,
        }
      }
    },
    [pageSize, additionalParams, queryClient]
  )

  const loadInitialJobDescriptionOptions = useCallback(
    async (values: (string | number)[]): Promise<SelectOption[]> => {
      if (!values || values.length === 0) {
        return []
      }

      try {
        // Fetch by ID using getJobDescription endpoint
        const fetchPromises = values.map(async (id) => {
          try {
            const jd = await queryClient.fetchQuery({
              queryKey: QUERY_KEYS.HRM.JOB_DESCRIPTIONS.DETAIL(Number(id)),
              queryFn: () => getJobDescriptionService().getJobDescription(Number(id)),
              staleTime: 1000 * 60 * 5, // 5 minutes cache
            })

            if (jd) {
              return {
                label: jd.title,
                value: jd.id,
              } as SelectOption
            }

            return {
              label: String(id),
              value: id,
            } as SelectOption
          } catch (error) {
            console.error(`Error fetching job description ${id}:`, error)
            return {
              label: String(id),
              value: id,
            } as SelectOption
          }
        })

        const results = await Promise.all(fetchPromises)
        return results
      } catch (error) {
        console.error('Error loading initial job description options:', error)
        return values.map((value) => ({
          label: String(value),
          value,
        })) as SelectOption[]
      }
    },
    [queryClient]
  )

  return {
    loadJobDescriptionOptions,
    loadInitialJobDescriptionOptions,
  }
}
