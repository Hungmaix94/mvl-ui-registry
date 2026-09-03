import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  getRoleService,
  type GetRolesDropdownParams,
  type RoleDropdown,
} from '@/services/role-service'
import { QUERY_KEYS } from '@/constants'
import type {
  LoadOptionsParams,
  LoadOptionsResult,
  SelectOption,
} from '../ui/select/Select'
import { PAGE_SIZE } from '../constants/table'

export type UseRoleSelectOptions = {
  pageSize?: number
}

export function useRoleSelect(options: UseRoleSelectOptions = {}) {
  const { pageSize = PAGE_SIZE } = options
  const queryClient = useQueryClient()

  const loadRoleOptions = useCallback(
    async (params: LoadOptionsParams): Promise<LoadOptionsResult<SelectOption>> => {
      if (!params) {
        return { items: [], hasNextPage: false, nextPage: null }
      }
      try {
        const apiParams: GetRolesDropdownParams = {
          page: params.page,
          page_size: params.pageSize || pageSize,
        }
        if (params.query) {
          apiParams.search = params.query
        }

        const queryKey = QUERY_KEYS.ROLES.DROPDOWN(apiParams)
        const response = await queryClient.fetchQuery({
          queryKey,
          queryFn: () => getRoleService().getRolesDropdown(apiParams),
          staleTime: 1000 * 60 * 10,
        })

        if (!response || !response.results) {
          return { items: [], hasNextPage: false, nextPage: null }
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

        const items: SelectOption[] = response.results.map((role: RoleDropdown) => ({
          label: role.name,
          value: String(role.id),
        }))

        return { items, hasNextPage: hasNext, nextPage }
      } catch (error) {
        console.error('Error loading role options:', error)
        return { items: [], hasNextPage: false, nextPage: null }
      }
    },
    [pageSize, queryClient]
  )

  const loadInitialRoleOptions = useCallback(
    async (values: (string | number)[]): Promise<SelectOption[]> => {
      if (!values || !values.length) return []
      try {
        const uniqueIds = Array.from(
          new Set(values.map((v) => Number(v)).filter((id) => !Number.isNaN(id) && id > 0))
        )
        if (!uniqueIds.length) return []

        const queryKey = QUERY_KEYS.ROLES.DROPDOWN({ id__in: uniqueIds.map(Number) })
        const response = await queryClient.fetchQuery({
          queryKey,
          queryFn: () => getRoleService().getRolesDropdown({ id__in: uniqueIds.map(Number) }),
          staleTime: 1000 * 60 * 10,
        })

        if (!response?.results?.length) {
          return uniqueIds.map((id) => ({ label: String(id), value: String(id) })) as SelectOption[]
        }

        const resultMap = new Map<number, RoleDropdown>()
        for (const r of response.results) {
          resultMap.set(r.id, r)
        }

        return uniqueIds.map((id) => {
          const role = resultMap.get(id)
          return role
            ? { label: role.name, value: String(role.id) }
            : { label: String(id), value: String(id) }
        }) as SelectOption[]
      } catch (error) {
        console.error('Error loading initial role options:', error)
        return values.map((v) => ({ label: String(v), value: String(v) })) as SelectOption[]
      }
    },
    [queryClient]
  )

  return { loadRoleOptions, loadInitialRoleOptions }
}
