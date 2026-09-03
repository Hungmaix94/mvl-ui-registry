import { useCallback, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  getEmployeeService,
  type GetEmployeesDropdownParams,
  type EmployeeDropdown,
} from '@/features/employee/services/employee-service'
import { QUERY_KEYS } from '@/constants'
import { PAGE_SIZE } from '@/constants/table.ts'
import type {
  LoadOptionsParams,
  LoadOptionsResult,
  SelectOption,
} from '@/components/ui/select/Select.tsx'

type UseEmployeeSelectOptions = {
  valueType?: 'id' | 'code'
  fields?: string[]
  pageSize?: number
  additionalParams?: GetEmployeesDropdownParams | (() => GetEmployeesDropdownParams)
}

export function useEmployeeSelect(options: UseEmployeeSelectOptions = {}) {
  const {
    valueType = 'id',
    fields = ['code', 'id', 'fullname'],
    pageSize = PAGE_SIZE,
    additionalParams,
  } = options

  const queryClient = useQueryClient()
  const dropdownCacheRef = useRef<Map<number, EmployeeDropdown>>(new Map())

  const getCachedEmployeeById = useCallback((id: number): EmployeeDropdown | undefined => {
    return dropdownCacheRef.current.get(id)
  }, [])

  const loadEmployeeOptions = useCallback(
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

        // Build API params for employees dropdown query
        const apiParams: GetEmployeesDropdownParams = {
          page: params.page,
          page_size: params.pageSize || pageSize,
          ...resolvedAdditionalParams,
        }

        // Add search query if provided (merge with additionalParams.search if exists)
        if (params.query) {
          apiParams.search = params.query
        }

        // Use React Query to fetch and cache the data
        const queryKey = QUERY_KEYS.HRM.EMPLOYEES.DROPDOWN(apiParams)
        const paginatedData = await queryClient.fetchQuery({
          queryKey,
          queryFn: () => getEmployeeService().listEmployeesDropdown(apiParams),
          staleTime: 1000 * 60 * 5, // 5 minutes cache
        })

        // getPaginated returns TPaginatedData directly: { count, next, previous, results }
        if (!paginatedData || !paginatedData.results) {
          return {
            items: [],
            hasNextPage: false,
            nextPage: null,
          }
        }

        // Parse next page number from next URL
        // This ensures we use the exact page number from API response
        let nextPage: number | null = null
        const hasNext = !!paginatedData.next

        if (hasNext && paginatedData.next) {
          try {
            // Handle both absolute and relative URLs
            const nextUrl = paginatedData.next.startsWith('http')
              ? new URL(paginatedData.next)
              : new URL(paginatedData.next, window.location.origin)
            const nextPageParam = nextUrl.searchParams.get('page')
            if (nextPageParam) {
              nextPage = Number(nextPageParam)
            }
          } catch (error) {
            // If URL parsing fails, try to extract page from query string manually
            const pageMatch = paginatedData.next.match(/[?&]page=(\d+)/)
            if (pageMatch) {
              nextPage = Number(pageMatch[1])
            } else {
              // Fallback: increment current page if parsing fails
              nextPage = params.page + 1
            }
          }
        }

        // Cache full EmployeeDropdown by id so consumers can use it without refetch (e.g. cascade select)
        paginatedData.results.forEach((emp: EmployeeDropdown) => {
          dropdownCacheRef.current.set(emp.id, emp)
        })

        // Map employees to SelectOption format based on valueType
        // Convert value to string for consistency with Select component
        const items: SelectOption[] = paginatedData.results.map((emp: EmployeeDropdown) => {
          const value = valueType === 'code' ? String(emp.code) : String(emp.id)
          const label = `${emp.code} - ${emp.fullname?.trim() || ''}`
          return {
            label,
            value,
          }
        })

        return {
          items,
          hasNextPage: hasNext,
          nextPage,
        }
      } catch (error) {
        console.error('Error loading employee options:', error)
        return {
          items: [],
          hasNextPage: false,
          nextPage: null,
        }
      }
    },
    [valueType, fields, pageSize, additionalParams, queryClient]
  )

  const loadInitialEmployeeOptions = useCallback(
    async (values: (string | number)[]): Promise<SelectOption[]> => {
      if (!values || values.length === 0) {
        return []
      }

      try {
        if (valueType === 'code') {
          // Fetch by code with exact match validation
          const fetchPromises = values.map(async (code) => {
            const apiParams: GetEmployeesDropdownParams = {
              code: String(code),
              page: 1,
              page_size: 1, // We only need 1 result per code
            }

            const queryKey = QUERY_KEYS.HRM.EMPLOYEES.DROPDOWN(apiParams)
            const paginatedData = await queryClient.fetchQuery({
              queryKey,
              queryFn: () => getEmployeeService().listEmployeesDropdown(apiParams),
              staleTime: 1000 * 60 * 5, // 5 minutes cache
            })

            // Validate exact match: API search returns partial matches, we need exact match
            if (paginatedData?.results && paginatedData.results.length > 0) {
              const emp = paginatedData.results[0]
              if (emp.code && emp.code.toLowerCase() === String(code).toLowerCase()) {
                dropdownCacheRef.current.set(emp.id, emp)
                return {
                  label: `${emp.code} - ${emp.fullname?.trim() || ''}`,
                  value: String(emp.code),
                } as SelectOption
              }
            }

            // If not found or no exact match, return null to filter out
            return null
          })

          // Wait for all promises and filter out nulls
          const results = await Promise.all(fetchPromises)
          return results.filter((item): item is SelectOption => item !== null)
        } else {
          // Fetch by ID using dropdown API with id__in filter
          const fetchPromises = values.map(async (id) => {
            try {
              const apiParams: GetEmployeesDropdownParams = {
                id__in: String(id) as any,
                page: 1,
                page_size: 1,
              }
              const paginatedData = await queryClient.fetchQuery({
                queryKey: QUERY_KEYS.HRM.EMPLOYEES.DROPDOWN(apiParams),
                queryFn: () => getEmployeeService().listEmployeesDropdown(apiParams),
                staleTime: 1000 * 60 * 5, // 5 minutes cache
              })

              const emp = paginatedData?.results?.[0]
              if (emp) {
                dropdownCacheRef.current.set(emp.id, emp)
                return {
                  label: `${emp.code} - ${emp.fullname?.trim() || ''}`,
                  value: String(emp.id),
                } as SelectOption
              }

              return {
                label: String(id),
                value: String(id),
              } as SelectOption
            } catch (error) {
              console.error(`Error fetching employee ${id}:`, error)
              return {
                label: String(id),
                value: String(id),
              } as SelectOption
            }
          })

          const results = await Promise.all(fetchPromises)
          return results
        }
      } catch (error) {
        console.error('Error loading initial employee options:', error)
        // Return fallback options
        return values.map((value) => ({
          label: String(value),
          value: String(value),
        })) as SelectOption[]
      }
    },
    [valueType, fields, queryClient]
  )

  return {
    loadEmployeeOptions,
    loadInitialEmployeeOptions,
    getCachedEmployeeById,
  }
}
