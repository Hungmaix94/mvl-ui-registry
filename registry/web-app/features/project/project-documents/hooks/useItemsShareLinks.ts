import { useCallback, useMemo } from 'react'
import { useQueries, useQueryClient } from '@tanstack/react-query'

import type { components } from '@/api/schema'
import { getElibraryService } from '@/services/elibrary-service'

type ShareLink = components['schemas']['LibraryAccessTokenRead']

/**
 * Batch-load share-links cho danh sách item — dùng trong Share Dialog để biết
 * item nào đã có public link (và link nào còn active).
 *
 * Endpoint elibrary `/api/elibrary/items/{id}/share-links/` dùng chung cho cả
 * project documents (Q&A: shared DB), nên hook này hợp lệ cho cả 2 module.
 *
 * Query key dùng chung với `useElibraryShareLinks` để React Query cache reuse.
 */
export function useItemsShareLinks(itemIds: number[], options?: { enabled?: boolean }) {
  const enabled = options?.enabled ?? true
  const queryClient = useQueryClient()

  const queries = useQueries({
    queries: itemIds.map((id) => ({
      queryKey: ['elibrary', 'items', id, 'share-links'] as const,
      queryFn: () => getElibraryService().getShareLinks(id),
      enabled: enabled && id > 0,
      staleTime: 1000 * 60 * 5,
    })),
  })

  const activeLinkByItemId = useMemo(() => {
    const map = new Map<number, ShareLink | null>()
    itemIds.forEach((id, idx) => {
      const data = queries[idx]?.data as { results?: ShareLink[] } | ShareLink[] | undefined
      const list: ShareLink[] = Array.isArray(data) ? data : (data?.results ?? [])
      // Active: BE đánh dấu is_active, không có revoked_at. BE đảm bảo expires_at chưa qua.
      const active = list.find((link) => link.is_active && !link.revoked_at) ?? null
      map.set(id, active)
    })
    return map
    // queries là array mới mỗi render — depend vào itemIds + serialized data is enough
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemIds, queries.map((q) => q.dataUpdatedAt).join('|')])

  const isLoading = queries.some((q) => q.isLoading)

  const refetchByItemId = useCallback(
    (itemId: number) =>
      queryClient.invalidateQueries({
        queryKey: ['elibrary', 'items', itemId, 'share-links'],
      }),
    [queryClient]
  )

  return { activeLinkByItemId, isLoading, refetchByItemId }
}
