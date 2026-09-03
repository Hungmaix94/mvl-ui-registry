import { useCallback, useEffect, useRef, useState } from 'react'
import type { RealestateLibraryFileRead } from '@/services/document-service'

const FAVORITE_SYNC_DEBOUNCE_MS = 250

type UseProjectDocumentsImportantParams = {
  items: Array<Pick<RealestateLibraryFileRead, 'id' | 'is_favorited'>>
  toggleFavoriteMutation: {
    mutateAsync: (itemId: number) => Promise<unknown>
  }
  onBatchSyncComplete?: () => void
}

export function useProjectDocumentsImportant({
  items,
  toggleFavoriteMutation,
  onBatchSyncComplete,
}: UseProjectDocumentsImportantParams) {
  const [importantById, setImportantById] = useState<Record<number, boolean>>({})
  const importantByIdRef = useRef<Record<number, boolean>>({})
  const [desiredImportantById, setDesiredImportantById] = useState<Record<number, boolean>>({})
  const desiredImportantByIdRef = useRef<Record<number, boolean>>({})
  const inFlightIdsRef = useRef<Set<number>>(new Set())
  const serverImportantByIdRef = useRef<Record<number, boolean>>({})
  const batchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    importantByIdRef.current = importantById
  }, [importantById])

  useEffect(() => {
    desiredImportantByIdRef.current = desiredImportantById
  }, [desiredImportantById])

  useEffect(() => {
    const matchedDesiredIds: number[] = []
    setImportantById((prev) => {
      const next: Record<number, boolean> = {}
      let changed = false
      const itemIds = new Set<number>()

      items.forEach((item) => {
        const itemId = item.id
        itemIds.add(itemId)
        const apiImportant = !!item.is_favorited
        serverImportantByIdRef.current[itemId] = apiImportant
        const desiredImportant = desiredImportantByIdRef.current[itemId]
        const isPending =
          typeof desiredImportant === 'boolean' || inFlightIdsRef.current.has(itemId)
        const resolvedValue = isPending
          ? (prev[itemId] ?? desiredImportant ?? apiImportant)
          : apiImportant
        next[itemId] = resolvedValue

        if (!isPending && desiredImportant === apiImportant) {
          matchedDesiredIds.push(itemId)
        }

        if (!changed && prev[itemId] !== resolvedValue) {
          changed = true
        }
      })

      Object.keys(prev).forEach((rawId) => {
        const itemId = Number(rawId)
        if (!itemIds.has(itemId)) {
          changed = true
          inFlightIdsRef.current.delete(itemId)
          delete serverImportantByIdRef.current[itemId]
        }
      })

      return changed ? next : prev
    })
    if (matchedDesiredIds.length === 0) return
    setDesiredImportantById((prev) => {
      const next = { ...prev }
      matchedDesiredIds.forEach((itemId) => {
        if (next[itemId] === serverImportantByIdRef.current[itemId]) {
          delete next[itemId]
        }
      })
      return next
    })
  }, [items])

  const syncBatch = useCallback(async () => {
    const desired = desiredImportantByIdRef.current
    const idsToSync: number[] = []
    for (const rawId of Object.keys(desired)) {
      const itemId = Number(rawId)
      if (Number.isNaN(itemId)) continue
      if (inFlightIdsRef.current.has(itemId)) continue
      const desiredValue = desired[itemId]
      if (typeof desiredValue !== 'boolean') continue
      const serverValue = serverImportantByIdRef.current[itemId] ?? false
      if (desiredValue === serverValue) continue
      idsToSync.push(itemId)
    }

    if (idsToSync.length === 0) return

    idsToSync.forEach((id) => inFlightIdsRef.current.add(id))

    const results = await Promise.allSettled(
      idsToSync.map((id) => toggleFavoriteMutation.mutateAsync(id).then(() => id))
    )

    const failedIds: number[] = []

    results.forEach((result, index) => {
      const itemId = idsToSync[index]
      inFlightIdsRef.current.delete(itemId)

      if (result.status === 'fulfilled') {
        const serverBefore = serverImportantByIdRef.current[itemId] ?? false
        serverImportantByIdRef.current[itemId] = !serverBefore
      } else {
        failedIds.push(itemId)
        console.error('Failed to sync important flag for item', itemId, result.reason)
      }
    })

    if (failedIds.length > 0) {
      setImportantById((prev) => {
        const next = { ...prev }
        failedIds.forEach((id) => {
          next[id] = serverImportantByIdRef.current[id] ?? false
        })
        return next
      })
      setDesiredImportantById((prev) => {
        const next = { ...prev }
        failedIds.forEach((id) => delete next[id])
        return next
      })
    }

    setDesiredImportantById((prev) => {
      const next = { ...prev }
      let changed = false
      idsToSync.forEach((id) => {
        if (failedIds.includes(id)) return
        const latestDesired = next[id]
        const latestServer = serverImportantByIdRef.current[id] ?? false
        if (typeof latestDesired === 'boolean' && latestDesired === latestServer) {
          delete next[id]
          changed = true
        }
      })
      return changed ? next : prev
    })

    if (results.some((r) => r.status === 'fulfilled')) {
      onBatchSyncComplete?.()
    }

    const stillPending = Object.keys(desiredImportantByIdRef.current).some((rawId) => {
      const itemId = Number(rawId)
      const d = desiredImportantByIdRef.current[itemId]
      const s = serverImportantByIdRef.current[itemId] ?? false
      return typeof d === 'boolean' && d !== s
    })
    if (stillPending) {
      batchTimerRef.current = setTimeout(() => {
        batchTimerRef.current = null
        void syncBatch()
      }, FAVORITE_SYNC_DEBOUNCE_MS)
    }
  }, [toggleFavoriteMutation, onBatchSyncComplete])

  useEffect(() => {
    const hasDesired = Object.keys(desiredImportantById).length > 0
    if (!hasDesired) {
      if (batchTimerRef.current) {
        clearTimeout(batchTimerRef.current)
        batchTimerRef.current = null
      }
      return
    }

    if (batchTimerRef.current) {
      clearTimeout(batchTimerRef.current)
    }
    batchTimerRef.current = setTimeout(() => {
      batchTimerRef.current = null
      void syncBatch()
    }, FAVORITE_SYNC_DEBOUNCE_MS)
  }, [desiredImportantById, syncBatch])

  useEffect(
    () => () => {
      if (batchTimerRef.current) {
        clearTimeout(batchTimerRef.current)
        batchTimerRef.current = null
      }
    },
    []
  )

  const queueDesiredImportant = useCallback((itemId: number, nextValue: boolean) => {
    setImportantById((prev) => ({
      ...prev,
      [itemId]: nextValue,
    }))
    setDesiredImportantById((prev) => ({
      ...prev,
      [itemId]: nextValue,
    }))
  }, [])

  const handleMarkImportant = useCallback(
    (ids: number[]) => {
      if (ids.length === 0) return
      ids.forEach((id) => {
        queueDesiredImportant(id, true)
      })
    },
    [queueDesiredImportant]
  )

  const handleUnmarkImportant = useCallback(
    (ids: number[]) => {
      if (ids.length === 0) return
      ids.forEach((id) => {
        queueDesiredImportant(id, false)
      })
    },
    [queueDesiredImportant]
  )

  const handleToggleItemImportant = useCallback(
    (itemId: number, value?: boolean) => {
      const currentImportant =
        importantByIdRef.current[itemId] ?? serverImportantByIdRef.current[itemId] ?? false
      const nextValue = typeof value === 'boolean' ? value : !currentImportant
      queueDesiredImportant(itemId, nextValue)
    },
    [queueDesiredImportant]
  )

  return {
    importantById,
    handleMarkImportant,
    handleUnmarkImportant,
    handleToggleItemImportant,
  }
}
