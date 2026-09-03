import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  getDepartmentService,
  type GetDepartmentsDropdownParams,
  type DepartmentDropdown,
} from '@/features/org/services/department-service'
import { QUERY_KEYS } from '@/constants'
import type {
  LoadOptionsParams,
  LoadOptionsResult,
  SelectOption,
} from '@/components/ui/select/Select.tsx'
import { PAGE_SIZE } from '@/constants/table'

type UseDepartmentSelectOptions = {
  pageSize?: number
  additionalParams?: GetDepartmentsDropdownParams | (() => GetDepartmentsDropdownParams)
}

export function useDepartmentSelect(options: UseDepartmentSelectOptions = {}) {
  const { pageSize = PAGE_SIZE, additionalParams } = options

  const queryClient = useQueryClient()

  const loadDepartmentOptions = useCallback(
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

        const apiParams: GetDepartmentsDropdownParams = {
          page: params.page,
          page_size: params.pageSize || pageSize,
          ...resolvedAdditionalParams,
        }

        if (params.query) {
          apiParams.search = params.query
        }

        const queryKey = QUERY_KEYS.HRM.DEPARTMENTS.DROPDOWN(apiParams)
        const response = await queryClient.fetchQuery({
          queryKey,
          queryFn: () => getDepartmentService().getDepartmentsDropdown(apiParams),
          staleTime: 1000 * 60 * 10,
        })

        if (!response || !response.results) {
          console.warn('No results in departments API response:', response)
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

        const items: SelectOption[] = response.results.map((dept: DepartmentDropdown) => ({
          label: dept.name,
          value: String(dept.id),
        }))

        return {
          items,
          hasNextPage: hasNext,
          nextPage,
        }
      } catch (error) {
        console.error('Error loading department options:', error)
        return {
          items: [],
          hasNextPage: false,
          nextPage: null,
        }
      }
    },
    [pageSize, additionalParams, queryClient]
  )

  const loadInitialDepartmentOptions = useCallback(
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

        const apiParams: GetDepartmentsDropdownParams = {
          id__in: ids.map(Number),
          ...resolvedAdditionalParams,
        }

        const queryKey = QUERY_KEYS.HRM.DEPARTMENTS.DROPDOWN(apiParams)
        const response = await queryClient.fetchQuery({
          queryKey,
          queryFn: () => getDepartmentService().getDepartmentsDropdown(apiParams),
          staleTime: 1000 * 60 * 10,
        })

        if (!response?.results?.length) {
          return ids.map((id) => ({ label: String(id), value: String(id) })) as SelectOption[]
        }

        const resultMap = new Map<number, DepartmentDropdown>()
        for (const d of response.results) {
          resultMap.set(d.id, d)
        }

        return ids.map((id) => {
          const dept = resultMap.get(id)
          return dept
            ? { label: dept.name, value: String(dept.id) }
            : { label: String(id), value: String(id) }
        }) as SelectOption[]
      } catch (error) {
        console.error('Error loading initial department options:', error)
        return values.map((value) => ({
          label: String(value),
          value: String(value),
        })) as SelectOption[]
      }
    },
    [additionalParams, queryClient]
  )

  return {
    loadDepartmentOptions,
    loadInitialDepartmentOptions,
  }
}
