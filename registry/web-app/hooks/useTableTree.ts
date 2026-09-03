import { useMemo } from 'react'
import { getWidthInPixels } from '@/utils/table/columnHelpers.tsx'

type ColumnLike = {
  id: string
  meta?: {
    frozen?: boolean
    width?: string
  }
}

export function useTableTree<T>(columns: Array<T & ColumnLike>) {
  const frozenOffsets = useMemo(() => {
    const offsets: Record<string, number> = {}
    let left = 0
    columns.forEach((col) => {
      if (col.meta?.frozen) {
        offsets[col.id] = left
        left += getWidthInPixels(col.meta?.width || '120px')
      }
    })
    return offsets
  }, [columns])

  const columnSizes = useMemo(() => {
    const sizes: Record<string, number> = {}
    columns.forEach((col) => {
      if (col.meta?.width) {
        sizes[col.id] = getWidthInPixels(col.meta.width)
      }
    })
    return sizes
  }, [columns])

  return {
    frozenOffsets,
    columnSizes,
  }
}

export default useTableTree
