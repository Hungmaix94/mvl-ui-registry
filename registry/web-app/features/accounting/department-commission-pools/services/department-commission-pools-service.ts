import { BaseApiService } from '@/api/base-service'
import { extractApiData } from '@/api/response-handler'
import { ApiPaths, components, paths } from '@/api/schema'
import { QUERY_KEYS } from '@/constants'
import { useApiMutation, useApiQuery } from '@/hooks/useApiQuery'

export type DepartmentCommissionPool = components['schemas']['DepartmentCommissionPool']

// BE 2026-07-28: POST /department-commission-pools/rebuild/ re-runs every calculator for a
// period so newly-added SupportDeptCommissionRateConfig rows produce pool contributions
// without waiting for a PBTV-approve event. Endpoint not yet deployed → not in schema.ts;
// call the raw path + local types, KHONG regen schema. Remove casts after canonical regen.
export type DeptPoolRebuildRequest = { year: number; month: number }
export type DeptPoolRebuildResult = { rebuilt: number; pool_ids: number[] }
const DEPT_POOL_REBUILD_PATH = '/api/accounting/department-commission-pools/rebuild/'
export type DepartmentCommissionPoolLine = components['schemas']['DepartmentCommissionPoolLine']
export type PaginatedDepartmentCommissionPoolList =
  components['schemas']['PaginatedDepartmentCommissionPoolList']
export type GetDepartmentCommissionPoolsParams =
  paths['/api/accounting/department-commission-pools/']['get']['parameters']['query']

export type DeptPoolConfirmLineRequest = components['schemas']['DeptPoolConfirmLineRequest']
export type DeptPoolConfirmLinesResult = components['schemas']['DeptPoolConfirmLinesResult']
export type DeptPoolImportLinesRequest = components['schemas']['DeptPoolImportLinesRequest']

class DepartmentCommissionPoolsService extends BaseApiService {
  async getPools(
    params?: GetDepartmentCommissionPoolsParams
  ): Promise<PaginatedDepartmentCommissionPoolList> {
    return await this.getPaginated(ApiPaths.accounting_department_commission_pools_list, params)
  }

  async getPool(id: number): Promise<DepartmentCommissionPool> {
    return await this.get(ApiPaths.accounting_department_commission_pools_retrieve, {
      path: { id },
    })
  }

  async confirmPool(id: number): Promise<DepartmentCommissionPool> {
    return await this.post(
      ApiPaths.accounting_department_commission_pools_confirm_create,
      undefined,
      { path: { id } }
    )
  }

  async confirmLine(
    id: number,
    data: DeptPoolConfirmLineRequest
  ): Promise<DepartmentCommissionPool> {
    return await this.post(
      ApiPaths.accounting_department_commission_pools_confirm_line_create,
      data,
      { path: { id } }
    )
  }

  // Duyệt mọi dòng DRAFT của pool trong một request. Trả kết quả partial-success
  // ({confirmed, skipped}) chứ KHÔNG trả pool, nên caller phải invalidate query chi tiết.
  async confirmLines(id: number): Promise<DeptPoolConfirmLinesResult> {
    return await this.post(
      ApiPaths.accounting_department_commission_pools_confirm_lines_create,
      undefined,
      { path: { id } }
    )
  }

  async importLines(
    id: number,
    data: DeptPoolImportLinesRequest
  ): Promise<DepartmentCommissionPool> {
    return await this.post(
      ApiPaths.accounting_department_commission_pools_import_lines_create,
      data,
      { path: { id } }
    )
  }

  async downloadImportTemplate(id?: number): Promise<void> {
    const endpoint = id
      ? `/api/accounting/department-commission-pools/${id}/import-template/`
      : '/api/accounting/department-commission-pools/import-template/'

    const response = (await this.client.GET(endpoint as any, {
      parseAs: 'blob',
    })) as unknown as { data?: Blob; error?: unknown }

    if (response.error) throw response.error

    const blob = response.data as Blob
    const url = window.URL.createObjectURL(new Blob([blob]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute(
      'download',
      id
        ? `mau_import_chia_hoa_hong_phong_ban_${id}.xlsx`
        : 'mau_import_chia_hoa_hong_phong_ban.xlsx'
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }

  async exportExcel(id: number): Promise<void> {
    const response = (await this.client.GET(
      ApiPaths.accounting_department_commission_pools_export_excel_retrieve,
      {
        params: { path: { id } },
        parseAs: 'blob',
      }
    )) as unknown as { data?: Blob; error?: unknown }

    if (response.error) throw response.error

    const blob = response.data as Blob
    const url = window.URL.createObjectURL(new Blob([blob]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `department_commission_pool_${id}.xlsx`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }

  async rebuildPools(data: DeptPoolRebuildRequest): Promise<DeptPoolRebuildResult> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await this.client.POST(DEPT_POOL_REBUILD_PATH as any, {
      body: data as any,
    })
    return extractApiData<DeptPoolRebuildResult>(response)
  }

  async getPoolHistories(id: number, params?: Record<string, unknown>) {
    return await this.get(ApiPaths.accounting_department_commission_pools_histories_retrieve, {
      path: { id: String(id) },
      query: params,
    })
  }

  async getPoolHistory(id: number, logId: string) {
    return await this.get(ApiPaths.accounting_department_commission_pools_history_retrieve, {
      path: { id: String(id), log_id: logId },
    })
  }
}

let _service: DepartmentCommissionPoolsService | null = null

export function getDepartmentCommissionPoolsService(): DepartmentCommissionPoolsService {
  if (!_service) _service = new DepartmentCommissionPoolsService()
  return _service
}

export function useDepartmentCommissionPools(
  params?: GetDepartmentCommissionPoolsParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.DEPARTMENT_COMMISSION_POOLS.LIST(params || {}),
    () => getDepartmentCommissionPoolsService().getPools(params),
    { enabled: options?.enabled ?? true, staleTime: 1000 * 60 * 5 }
  )
}

export function useDepartmentCommissionPool(id: number, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.DEPARTMENT_COMMISSION_POOLS.DETAIL(id),
    () => getDepartmentCommissionPoolsService().getPool(id),
    { enabled: !!id && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useConfirmDepartmentCommissionPool() {
  return useApiMutation((id: number) => getDepartmentCommissionPoolsService().confirmPool(id))
}

export function useConfirmDepartmentCommissionPoolLine() {
  return useApiMutation((variables: { id: number; data: DeptPoolConfirmLineRequest }) =>
    getDepartmentCommissionPoolsService().confirmLine(variables.id, variables.data)
  )
}

export function useConfirmDepartmentCommissionPoolLines() {
  return useApiMutation((id: number) => getDepartmentCommissionPoolsService().confirmLines(id))
}

export function useImportDepartmentCommissionPoolLines() {
  return useApiMutation((variables: { id: number; data: DeptPoolImportLinesRequest }) =>
    getDepartmentCommissionPoolsService().importLines(variables.id, variables.data)
  )
}

export function useExportDepartmentCommissionPool() {
  return useApiMutation((id: number) => getDepartmentCommissionPoolsService().exportExcel(id))
}

export function useDownloadDeptPoolImportTemplate() {
  return useApiMutation((id?: number) =>
    getDepartmentCommissionPoolsService().downloadImportTemplate(id)
  )
}

export function useRebuildDepartmentCommissionPools() {
  return useApiMutation((data: DeptPoolRebuildRequest) =>
    getDepartmentCommissionPoolsService().rebuildPools(data)
  )
}

export function useDepartmentCommissionPoolHistories(
  id: number,
  params?: Record<string, unknown>,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.DEPARTMENT_COMMISSION_POOLS.HISTORIES(id, params || {}),
    () => getDepartmentCommissionPoolsService().getPoolHistories(id, params),
    { enabled: !!id && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useDepartmentCommissionPoolHistory(
  id: number,
  logId: string,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.DEPARTMENT_COMMISSION_POOLS.HISTORY_DETAIL(id, logId),
    () => getDepartmentCommissionPoolsService().getPoolHistory(id, logId),
    { enabled: !!id && !!logId && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}
