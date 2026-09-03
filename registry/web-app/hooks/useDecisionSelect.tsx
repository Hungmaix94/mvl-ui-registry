import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  getDecisionService,
  type GetDecisionsParams,
  type Decision,
} from '@/features/decision-and-proposal/services/decision-service'
import { QUERY_KEYS } from '@/constants'
import { PAGE_SIZE } from '@/constants/table'
import type {
  LoadOptionsParams,
  LoadOptionsResult,
  SelectOption,
} from '@/components/ui/select/Select'

type UseDecisionSelectOptions = {
  pageSize?: number
  additionalParams?: GetDecisionsParams | (() => GetDecisionsParams)
}

export function useDecisionSelect(options: UseDecisionSelectOptions = {}) {
  const { pageSize = PAGE_SIZE, additionalParams } = options

  const queryClient = useQueryClient()

  const loadDecisionOptions = useCallback(
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

        const apiParams: GetDecisionsParams = {
          page: params.page,
          page_size: params.pageSize || pageSize,
          ...resolvedAdditionalParams,
        }

        if (params.query) {
          apiParams.search = params.query
        }

        const queryKey = QUERY_KEYS.HRM.DECISIONS.LIST(apiParams)
        const paginatedData = await queryClient.fetchQuery({
          queryKey,
          queryFn: () => getDecisionService().getDecisions(apiParams),
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
          } catch (error) {
            const pageMatch = paginatedData.next.match(/[?&]page=(\d+)/)
            if (pageMatch) {
              nextPage = Number(pageMatch[1])
            } else {
              nextPage = params.page + 1
            }
          }
        }

        const items: SelectOption[] = paginatedData.results.map((decision: Decision) => ({
          value: decision.id,
          label: `${decision.decision_number} - ${decision.name}`,
        }))

        return {
          items,
          hasNextPage: hasNext,
          nextPage,
        }
      } catch (error) {
        console.error('Error loading decision options:', error)
        return {
          items: [],
          hasNextPage: false,
          nextPage: null,
        }
      }
    },
    [pageSize, additionalParams, queryClient]
  )

  const loadInitialDecisionOptions = useCallback(
    async (values: (string | number)[]): Promise<SelectOption[]> => {
      if (!values || values.length === 0) {
        return []
      }

      try {
        const fetchPromises = values.map(async (id) => {
          try {
            const decision = await queryClient.fetchQuery({
              queryKey: QUERY_KEYS.HRM.DECISIONS.DETAIL(Number(id)),
              queryFn: () => getDecisionService().getDecision(Number(id)),
              staleTime: 1000 * 60 * 5,
            })

            if (decision) {
              return {
                value: decision.id,
                label: `${decision.decision_number} - ${decision.name}`,
              } as SelectOption
            }

            return {
              label: String(id),
              value: String(id),
            } as SelectOption
          } catch (error) {
            console.error(`Error fetching decision ${id}:`, error)
            return {
              label: String(id),
              value: String(id),
            } as SelectOption
          }
        })

        const results = await Promise.all(fetchPromises)
        return results
      } catch (error) {
        console.error('Error loading initial decision options:', error)
        return values.map((value) => ({
          label: String(value),
          value: String(value),
        })) as SelectOption[]
      }
    },
    [queryClient]
  )

  return {
    loadDecisionOptions,
    loadInitialDecisionOptions,
  }
}
