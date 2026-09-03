import { useApiQuery } from '@/hooks/useApiQuery'
import { BaseApiService } from '@/api/base-service'
import { paths } from '@/api/schema'
import { QUERY_KEYS } from '@/constants'

type HistoriesKeys<T> = {
  [K in keyof T as K extends `${string}/{id}/histories/` ? K : never]: T[K]
}

type HistoryDetailKeys<T> = {
  [K in keyof T as K extends `${string}/{id}/history/{log_id}/` ? K : never]: T[K]
}

export type HistoriesPaths = keyof HistoriesKeys<paths>

export type HistoryDetailPaths = keyof HistoryDetailKeys<paths>

export class HistoriesService extends BaseApiService {
  async getHistories(path: HistoriesPaths, id: string, queryParams?: Record<string, any>) {
    return this.get(path, {
      path: { id },
      query: queryParams,
    })
  }

  async getHistoryDetail(path: HistoryDetailPaths, id: string, logId: string) {
    return this.get(path, {
      path: { id, log_id: logId },
    })
  }
}

export function useHistories(path: HistoriesPaths, id: string, queryParams?: Record<string, any>) {
  return useApiQuery(
    QUERY_KEYS.HISTORIES.LIST(path, Number(id), queryParams),
    () => new HistoriesService().getHistories(path, id, queryParams),
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  )
}

export function useHistoryDetail(path: HistoryDetailPaths, id: string, logId: string) {
  return useApiQuery(
    QUERY_KEYS.HISTORIES.DETAIL(path, Number(id), logId),
    () => new HistoriesService().getHistoryDetail(path, id, logId),
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  )
}
