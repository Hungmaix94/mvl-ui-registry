import { useState, useCallback, useEffect } from 'react'
import { useUserName } from '@/store/auth-store'
import {
  loadColumnConfigByStorageKey,
  saveColumnConfigByStorageKey,
} from '@/utils/table/columnStorage'
import { mergeColumns } from '@/utils/table/mergeColumns'
import type { ColumnConfig } from '@/types/table'

// Bất kỳ chuỗi nào cũng hợp lệ — key lưu = `${username}-${storageKey}-table-columns`.
// Liệt kê các key đã biết chỉ để gợi ý autocomplete.
export type ColumnConfigStorageKey =
  | 'employee'
  | 'project'
  | 'employee-org-tree'
  | 'employee-leadership'
  | 'contract'
  | 'accounting-sales-invoices'
  | (string & {})

export function useColumnConfig(
  defaultColumns: ColumnConfig[],
  options?: { storageKey?: ColumnConfigStorageKey }
) {
  const username = useUserName()
  const [columns, setColumns] = useState<ColumnConfig[]>(defaultColumns)
  const storageKey = options?.storageKey ?? 'employee'

  // Load from localStorage on mount
  useEffect(() => {
    const stored = loadColumnConfigByStorageKey(username, storageKey)
    if (stored) {
      const merged = mergeColumns(defaultColumns, stored.columns)
      setColumns(merged)
    }
  }, [username, defaultColumns, storageKey])

  const handleApply = useCallback(
    (newColumns: ColumnConfig[]) => {
      setColumns(newColumns)
      saveColumnConfigByStorageKey(username, storageKey, { columns: newColumns, version: 1 })
    },
    [username, storageKey]
  )

  const handleReset = useCallback(() => {
    const resetColumns = defaultColumns.map((col, index) => ({
      ...col,
      order: index,
    }))
    setColumns(resetColumns)
    saveColumnConfigByStorageKey(username, storageKey, { columns: resetColumns, version: 1 })
  }, [username, defaultColumns, storageKey])

  return { columns, handleApply, handleReset }
}
