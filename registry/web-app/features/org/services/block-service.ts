import { BaseApiService } from '@/api/base-service'
import { ApiPaths, components, paths } from '@/api/schema'
import { QUERY_KEYS } from '@/constants'
import { useApiMutation, useApiQuery } from '@/hooks/useApiQuery'
import type { HistoriesParams } from '@/types/hrm-types'
import { fetchAllPaginatedResults, HRM_LIST_PAGE_SIZE_MAX } from '@/utils/fetch-all-paginated'

// ===== TYPE DEFINITIONS =====
export type Block = components['schemas']['Block']
export type BlockRequest = components['schemas']['BlockRequest']
export type PatchedBlockRequest = components['schemas']['PatchedBlockRequest']
export type PaginatedBlockList = components['schemas']['PaginatedBlockList']

export type GetBlocksParams = paths['/api/hrm/blocks/']['get']['parameters']['query']
export type BlockDropdown = components['schemas']['BlockDropdown']
export type PaginatedBlockDropdownList = components['schemas']['PaginatedBlockDropdownList']
export type GetBlocksDropdownParams =
  paths['/api/hrm/blocks/dropdown/']['get']['parameters']['query']
export type GetBlocksExportParams = paths['/api/hrm/blocks/export/']['get']['parameters']['query']

// ===== SERVICE CLASS =====
export class BlockService extends BaseApiService {
  async getBlocks(params?: GetBlocksParams) {
    return await this.getPaginated(ApiPaths.hrm_blocks_list, params)
  }

  async createBlock(blockData: BlockRequest) {
    return await this.post(ApiPaths.hrm_blocks_create, blockData)
  }

  async getBlock(id: number) {
    return await this.get(ApiPaths.hrm_blocks_retrieve, { path: { id: id } })
  }

  async updateBlock(id: number, blockData: BlockRequest) {
    return await this.put(ApiPaths.hrm_blocks_update, blockData, {
      path: { id },
    })
  }

  async partialUpdateBlock(id: number, blockData: PatchedBlockRequest) {
    return await this.patch(ApiPaths.hrm_blocks_partial_update, blockData, {
      path: { id },
    })
  }

  async deleteBlock(id: number) {
    return await this.delete(ApiPaths.hrm_blocks_destroy, { path: { id } })
  }

  async getBlockHistories(id: number, params?: HistoriesParams) {
    return await this.get(ApiPaths.hrm_blocks_histories_retrieve, {
      path: { id: String(id) },
      query: params,
    })
  }

  async getBlocksDropdown(params?: GetBlocksDropdownParams) {
    return await this.getPaginated(ApiPaths.hrm_blocks_dropdown_list, params)
  }

  /**
   * Export blocks to XLSX
   */
  async exportBlocks(params?: GetBlocksExportParams) {
    return await this.get(ApiPaths.hrm_blocks_export_retrieve, {
      query: params,
    })
  }
}

// ===== SERVICE SINGLETON =====
let _blockService: BlockService | null = null

export function getBlockService(): BlockService {
  if (!_blockService) {
    _blockService = new BlockService()
  }
  return _blockService
}

// ===== REACT QUERY HOOKS =====
export function useBlocks(params?: GetBlocksParams, enabled?: boolean) {
  return useApiQuery(
    QUERY_KEYS.HRM.BLOCKS.LIST(params || {}),
    () => getBlockService().getBlocks(params),
    {
      staleTime: 1000 * 60 * 10,
      enabled: enabled !== false,
    }
  )
}

/** Fetches every block page (backend `page_size` max 100). */
export function useAllBlocks(options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.HRM.BLOCKS.LIST({ fetchAll: true }),
    () =>
      fetchAllPaginatedResults<Block>((page) =>
        getBlockService().getBlocks({ page, page_size: HRM_LIST_PAGE_SIZE_MAX })
      ),
    { staleTime: 1000 * 60 * 10, enabled: options?.enabled !== false }
  )
}

export function useBlock(id: number) {
  return useApiQuery(QUERY_KEYS.HRM.BLOCKS.DETAIL(id), () => getBlockService().getBlock(id), {
    enabled: !!id,
    staleTime: 1000 * 60 * 10,
  })
}

export function useCreateBlock() {
  return useApiMutation((data: BlockRequest) => getBlockService().createBlock(data))
}

export function useUpdateBlock() {
  return useApiMutation(({ id, data }: { id: number; data: BlockRequest }) =>
    getBlockService().updateBlock(id, data)
  )
}

export function usePartialUpdateBlock() {
  return useApiMutation(({ id, data }: { id: number; data: PatchedBlockRequest }) =>
    getBlockService().partialUpdateBlock(id, data)
  )
}

export function useDeleteBlock() {
  return useApiMutation((id: number) => getBlockService().deleteBlock(id))
}

export function useBlocksDropdown(
  params?: GetBlocksDropdownParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.HRM.BLOCKS.DROPDOWN(params || {}),
    () => getBlockService().getBlocksDropdown(params),
    {
      staleTime: 1000 * 60 * 10,
      enabled: options?.enabled !== false,
    }
  )
}
