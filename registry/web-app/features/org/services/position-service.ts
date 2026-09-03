import { BaseApiService } from '@/api/base-service'
import { ApiPaths, components, paths } from '@/api/schema'
import { QUERY_KEYS } from '@/constants'
import { useApiMutation, useApiQuery } from '@/hooks/useApiQuery'
import type { HistoriesParams } from '@/types/hrm-types'

// ===== TYPE DEFINITIONS =====
export type Position = components['schemas']['Position']
export type PositionRequest = components['schemas']['PositionRequest']
export type PatchedPositionRequest = components['schemas']['PatchedPositionRequest']
export type PaginatedPositionList = components['schemas']['PaginatedPositionList']

export type GetPositionsParams = paths['/api/hrm/positions/']['get']['parameters']['query']
export type PositionDropdown = components['schemas']['PositionDropdown']
export type PaginatedPositionDropdownList = components['schemas']['PaginatedPositionDropdownList']
export type GetPositionsDropdownParams =
  paths['/api/hrm/positions/dropdown/']['get']['parameters']['query']
export type GetPositionsExportParams =
  paths['/api/hrm/positions/export/']['get']['parameters']['query']

// ===== SERVICE CLASS =====
export class PositionService extends BaseApiService {
  async getPositions(params?: GetPositionsParams) {
    return await this.getPaginated(ApiPaths.hrm_positions_list, params)
  }

  async createPosition(positionData: PositionRequest) {
    return await this.post(ApiPaths.hrm_positions_create, positionData)
  }

  async getPosition(id: number) {
    return await this.get(ApiPaths.hrm_positions_retrieve, { path: { id: id } })
  }

  async updatePosition(id: number, positionData: PositionRequest) {
    return await this.put(ApiPaths.hrm_positions_update, positionData, {
      path: { id },
    })
  }

  async partialUpdatePosition(id: number, positionData: PatchedPositionRequest) {
    return await this.patch(ApiPaths.hrm_positions_partial_update, positionData, { path: { id } })
  }

  async deletePosition(id: number) {
    return await this.delete(ApiPaths.hrm_positions_destroy, { path: { id } })
  }

  async getPositionHistories(id: number, params?: HistoriesParams) {
    return await this.get(ApiPaths.hrm_positions_histories_retrieve, {
      path: { id: String(id) },
      query: params,
    })
  }

  async getPositionsDropdown(params?: GetPositionsDropdownParams) {
    return await this.getPaginated(ApiPaths.hrm_positions_dropdown_list, params)
  }

  /**
   * Export positions to XLSX
   */
  async exportPositions(params?: GetPositionsExportParams) {
    return await this.get(ApiPaths.hrm_positions_export_retrieve, {
      query: params,
    })
  }
}

// ===== SERVICE SINGLETON =====
let _positionService: PositionService | null = null

export function getPositionService(): PositionService {
  if (!_positionService) {
    _positionService = new PositionService()
  }
  return _positionService
}

// ===== REACT QUERY HOOKS =====
export function usePositions(params?: GetPositionsParams, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.HRM.POSITIONS.LIST(params || {}),
    () => getPositionService().getPositions(params),
    {
      staleTime: 1000 * 60 * 10,
      enabled: options?.enabled !== false,
    }
  )
}

export function usePosition(id: number) {
  return useApiQuery(
    QUERY_KEYS.HRM.POSITIONS.DETAIL(id),
    () => getPositionService().getPosition(id),
    {
      enabled: !!id,
      staleTime: 1000 * 60 * 10,
    }
  )
}

export function useCreatePosition() {
  return useApiMutation((data: PositionRequest) => getPositionService().createPosition(data))
}

export function useUpdatePosition() {
  return useApiMutation(({ id, data }: { id: number; data: PositionRequest }) =>
    getPositionService().updatePosition(id, data)
  )
}

export function usePartialUpdatePosition() {
  return useApiMutation(({ id, data }: { id: number; data: PatchedPositionRequest }) =>
    getPositionService().partialUpdatePosition(id, data)
  )
}

export function useDeletePosition() {
  return useApiMutation((id: number) => getPositionService().deletePosition(id))
}

export function usePositionsDropdown(
  params?: GetPositionsDropdownParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.HRM.POSITIONS.DROPDOWN(params || {}),
    () => getPositionService().getPositionsDropdown(params),
    {
      staleTime: 1000 * 60 * 10,
      enabled: options?.enabled !== false,
    }
  )
}
