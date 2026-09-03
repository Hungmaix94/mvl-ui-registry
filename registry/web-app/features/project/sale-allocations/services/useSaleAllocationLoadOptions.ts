import { useCallback } from 'react'
import { getRealEstateService } from '@/services/realestate-service'
import { getEmployeeService } from '@/features/employee/services/employee-service'
import { getDepartmentService } from '@/features/org/services/department-service'
import { LoadOptionsParams, LoadOptionsResult } from '@/components/ui/select/Select'

type Option = { label: string; value: string | number }
export function useSaleAllocationLoadOptions(params?: {
  investorId?: number | null
  projectId?: number | null
}) {
  const loadProjectOptions = useCallback(
    async (loadParams: LoadOptionsParams): Promise<LoadOptionsResult<Option>> => {
      const response = await getRealEstateService().getProjectDropdown({
        search: loadParams.query || '',
        investor: params?.investorId || undefined,
        page: loadParams.page || 1,
        page_size: loadParams.pageSize || 20,
      })
      const items =
        response.results?.map((item) => ({
          value: item.id,
          label: item.name,
        })) || []
      return {
        items,
        hasNextPage: !!response.next,
        nextPage: response.next ? (loadParams.page || 1) + 1 : null,
      }
    },
    [params?.investorId]
  )

  const loadInitialProjectOptions = useCallback(
    async (values: (number | string)[]): Promise<Option[]> => {
      if (!values || values.length === 0) return []
      try {
        const item = await getRealEstateService().getProject(Number(values[0]))
        return [{ value: item.id, label: item.name }]
      } catch {
        return []
      }
    },
    []
  )

  const loadExchangeOptions = useCallback(
    async (loadParams: LoadOptionsParams): Promise<LoadOptionsResult<Option>> => {
      const response = await getRealEstateService().getExchangeDropdown({
        search: loadParams.query || '',
        page: loadParams.page || 1,
        page_size: loadParams.pageSize || 20,
      })
      const items =
        response.results?.map((item) => ({
          value: item.id,
          label: `${item.name} ${item.code ? `(${item.code})` : ''}`,
        })) || []
      return {
        items,
        hasNextPage: !!response.next,
        nextPage: response.next ? (loadParams.page || 1) + 1 : null,
      }
    },
    []
  )

  const loadSourceExchangeOptions = useCallback(
    async (loadParams: LoadOptionsParams): Promise<LoadOptionsResult<Option>> => {
      const response = await getRealEstateService().getSourceExchangeDropdown({
        search: loadParams.query || '',
        page: loadParams.page || 1,
        page_size: loadParams.pageSize || 20,
      })
      const items =
        response.results?.map((item) => ({
          value: item.id,
          label: `${item.name} ${item.code ? `(${item.code})` : ''}`,
        })) || []
      return {
        items,
        hasNextPage: !!response.next,
        nextPage: response.next ? (loadParams.page || 1) + 1 : null,
      }
    },
    []
  )

  const loadInitialExchangeOptions = useCallback(
    async (values: (number | string)[]): Promise<Option[]> => {
      if (!values || values.length === 0) return []
      try {
        const item = await getRealEstateService().getExchange(Number(values[0]))
        return [
          {
            value: item.id,
            label: `${item.name} ${item.code ? `(${item.code})` : ''}`,
          },
        ]
      } catch {
        return []
      }
    },
    []
  )

  const loadInitialSourceExchangeOptions = useCallback(
    async (values: (number | string)[]): Promise<Option[]> => {
      if (!values || values.length === 0) return []
      try {
        const item = await getRealEstateService().getSourceExchange(Number(values[0]))
        return [
          {
            value: item.id,
            label: `${item.name} ${item.code ? `(${item.code})` : ''}`,
          },
        ]
      } catch {
        return []
      }
    },
    []
  )

  const loadEmployeeOptions = useCallback(
    async (loadParams: LoadOptionsParams): Promise<LoadOptionsResult<Option>> => {
      const response = await getEmployeeService().listEmployeesDropdown({
        search: loadParams.query || '',
        page: loadParams.page || 1,
        page_size: loadParams.pageSize || 20,
      })
      const items =
        response.results?.map((item: any) => ({
          value: item.id,
          label: `${item.fullname} - ${item.email || item.code}`,
        })) || []
      return {
        items,
        hasNextPage: !!response.next,
        nextPage: response.next ? (loadParams.page || 1) + 1 : null,
      }
    },
    []
  )

  const loadInitialEmployeeOptions = useCallback(
    async (values: (number | string)[]): Promise<Option[]> => {
      if (!values || values.length === 0) return []
      try {
        const item = await getEmployeeService().getEmployee(Number(values[0]))
        return [
          {
            value: item.id,
            label: `${item.fullname} - ${item.email || item.code}`,
          },
        ]
      } catch {
        return []
      }
    },
    []
  )

  const loadDepartmentOptions = useCallback(
    async (loadParams: LoadOptionsParams): Promise<LoadOptionsResult<Option>> => {
      const response = await getDepartmentService().getDepartmentsDropdown({
        search: loadParams.query || '',
        page: loadParams.page || 1,
        page_size: loadParams.pageSize || 20,
      })
      const items =
        response.results?.map((item: any) => ({
          value: item.id,
          label: item.name,
        })) || []
      return {
        items,
        hasNextPage: !!response.next,
        nextPage: response.next ? (loadParams.page || 1) + 1 : null,
      }
    },
    []
  )

  return {
    loadProjectOptions,
    loadInitialProjectOptions,
    loadExchangeOptions,
    loadInitialExchangeOptions,
    loadSourceExchangeOptions,
    loadInitialSourceExchangeOptions,
    loadEmployeeOptions,
    loadInitialEmployeeOptions,
    loadDepartmentOptions,
  }
}
