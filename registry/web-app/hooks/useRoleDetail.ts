// src/hooks/useRoleDetail.ts
import { useParams } from 'react-router-dom'
import { useRole } from '@/services/role-service'
import { useMemo } from 'react'
import { isNotFoundError } from '@/utils/error-utils'

export function useRoleDetail() {
  const { id } = useParams<{ id: string }>()
  const roleId = id ? parseInt(id, 10) : 0

  const { data: roleData, isLoading, error } = useRole(roleId)

  const role = useMemo(() => {
    return roleData || null
  }, [roleData])

  const isNotFound = useMemo(() => {
    if (isLoading) return false
    if (error && isNotFoundError(error)) return true
    return !role
  }, [isLoading, error, role])

  const isError = useMemo(() => {
    if (isLoading || !error) return false
    return !isNotFoundError(error)
  }, [isLoading, error])

  return {
    roleId,
    role,
    isLoading,
    error,
    isNotFound,
    isError,
  }
}
