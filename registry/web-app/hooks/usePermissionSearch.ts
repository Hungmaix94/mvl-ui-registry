import { useMemo } from 'react'
import type { Permission } from '@/services/permission-service'

export function usePermissionSearch(permissions: Permission[], searchValue: string): Permission[] {
  return useMemo(() => {
    if (!searchValue.trim()) return permissions

    const query = searchValue.trim().toLowerCase()
    return permissions.filter(
      (permission) =>
        permission.name?.toLowerCase().includes(query) ||
        permission.code?.toLowerCase().includes(query) ||
        permission.module?.toLowerCase().includes(query) ||
        permission.submodule?.toLowerCase().includes(query)
    )
  }, [permissions, searchValue])
}
