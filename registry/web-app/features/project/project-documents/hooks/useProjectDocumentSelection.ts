import { useCallback, useMemo, useState } from 'react'

type SelectionClickEvent = {
  ctrlKey: boolean
  shiftKey: boolean
}

export function useProjectDocumentSelection(itemIds: number[]) {
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [anchorIndex, setAnchorIndex] = useState<number | null>(null)

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds])

  const clearSelection = useCallback(() => {
    setSelectedIds([])
    setAnchorIndex(null)
  }, [])

  const isSelected = useCallback(
    (itemId: number) => {
      return selectedSet.has(itemId)
    },
    [selectedSet]
  )

  const handleSelect = useCallback(
    (itemId: number, event: SelectionClickEvent) => {
      const currentIndex = itemIds.indexOf(itemId)
      if (currentIndex < 0) return

      if (event.shiftKey && anchorIndex !== null) {
        const start = Math.min(anchorIndex, currentIndex)
        const end = Math.max(anchorIndex, currentIndex)
        const rangeIds = itemIds.slice(start, end + 1)
        setSelectedIds((prev) => {
          const merged = new Set(prev)
          rangeIds.forEach((id) => merged.add(id))
          return [...merged]
        })
        return
      }

      if (event.ctrlKey) {
        setSelectedIds((prev) => {
          if (prev.includes(itemId)) {
            return prev.filter((id) => id !== itemId)
          }
          return [...prev, itemId]
        })
        setAnchorIndex(currentIndex)
        return
      }

      setSelectedIds([itemId])
      setAnchorIndex(currentIndex)
    },
    [anchorIndex, itemIds]
  )

  return {
    selectedIds,
    selectedSet,
    isSelected,
    clearSelection,
    handleSelect,
    setSelectedIds,
  }
}
