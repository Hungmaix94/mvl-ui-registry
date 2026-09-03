import { useMemo } from 'react'
import { useBranchesDropdown } from '@/features/org/services/branch-service'
import { useBlocksDropdown } from '@/features/org/services/block-service'
import { useDepartmentsDropdown } from '@/features/org/services/department-service'
import { usePositionsDropdown } from '@/features/org/services/position-service'
import { useEmployeesDropdown } from '@/features/employee/services/employee-service'
import { useRolesDropdown } from '@/services/role-service'
import { useRecruitmentSourcesDropdown } from '@/features/recruitment/services/recruitment-source-service'
import { useRecruitmentChannelsDropdown } from '@/features/recruitment/services/recruitment-channel-service'
import { useRecruitmentRequestsDropdown } from '@/features/recruitment/services/recruitment-request-service'
import type { BranchDropdown } from '@/features/org/services/branch-service'
import type { BlockDropdown } from '@/features/org/services/block-service'
import type { DepartmentDropdown } from '@/features/org/services/department-service'
import type { PositionDropdown } from '@/features/org/services/position-service'

/**
 * Hook to validate branch ID from URL filter using dropdown API instead of get-by-id.
 * Returns shape compatible with useBranch for filter validation and display.
 */
export function useBranchForFilter(id: number) {
  const query = useBranchesDropdown(id ? { id__in: [id] } : undefined, { enabled: !!id })
  const data = useMemo<BranchDropdown | null>(() => {
    if (!query.data?.results?.length) return null
    return query.data.results.find((r) => r.id === id) ?? null
  }, [query.data, id])
  return { ...query, data }
}

/**
 * Hook to validate block ID from URL filter using dropdown API instead of get-by-id.
 * Returns shape compatible with useBlock for filter validation and display.
 * BlockDropdown has branch: number for cascade validation.
 */
export function useBlockForFilter(id: number, branchId?: number) {
  const query = useBlocksDropdown(id && branchId ? { id__in: [id], branch: branchId } : undefined, {
    enabled: !!(id && branchId),
  })
  const data = useMemo<BlockDropdown | null>(() => {
    if (!query.data?.results?.length) return null
    return query.data.results.find((r) => r.id === id) ?? null
  }, [query.data, id])
  return { ...query, data }
}

/**
 * Hook to validate department ID from URL filter using dropdown API instead of get-by-id.
 * Returns shape compatible with useDepartment for filter validation and display.
 * Validity is implied by API filter (branch, block) - if we get a result, it's valid.
 */
export function useDepartmentForFilter(id: number, branchId?: number, blockId?: number) {
  const query = useDepartmentsDropdown(
    id && branchId && blockId ? { id__in: [id], branch: branchId, block: blockId } : undefined,
    { enabled: !!(id && branchId && blockId) }
  )
  const data = useMemo<DepartmentDropdown | null>(() => {
    if (!query.data?.results?.length) return null
    return query.data.results.find((r) => r.id === id) ?? null
  }, [query.data, id])
  return { ...query, data }
}

/**
 * Hook to validate position ID from URL filter using dropdown API instead of get-by-id.
 * Returns shape compatible with usePosition for filter validation and display.
 */
export function usePositionForFilter(id: number) {
  const query = usePositionsDropdown(id ? { id__in: [id] } : undefined, { enabled: !!id })
  const data = useMemo<PositionDropdown | null>(() => {
    if (!query.data?.results?.length) return null
    return query.data.results.find((r) => r.id === id) ?? null
  }, [query.data, id])
  return { ...query, data }
}

/**
 * Hook to validate employee ID from URL filter using dropdown API instead of get-by-id.
 * Returns shape compatible with useEmployee for filter validation and display.
 */
export function useEmployeeForFilter(id: number) {
  const query = useEmployeesDropdown(id ? { id__in: [id] } : undefined, { enabled: !!id })
  const data = useMemo(() => {
    if (!query.data?.results?.length) return null
    return query.data.results.find((r) => r.id === id) ?? null
  }, [query.data, id])
  return { ...query, data }
}

/**
 * Hook to validate role ID from URL filter using dropdown API instead of get-by-id.
 * Returns shape compatible with useRole for filter validation and display.
 */
export function useRoleForFilter(id: number) {
  const query = useRolesDropdown(id ? { id__in: [id] } : undefined, { enabled: !!id })
  const data = useMemo(() => {
    if (!query.data?.results?.length) return null
    return query.data.results.find((r) => r.id === id) ?? null
  }, [query.data, id])
  return { ...query, data }
}

/**
 * Hook to validate recruitment source ID from URL filter using dropdown API instead of get-by-id.
 * Returns shape compatible with useRecruitmentSource for filter validation and display.
 */
export function useRecruitmentSourceForFilter(id: number) {
  const query = useRecruitmentSourcesDropdown(id ? { id__in: [id] } : undefined, { enabled: !!id })
  const data = useMemo(() => {
    if (!query.data?.results?.length) return null
    return query.data.results.find((r) => r.id === id) ?? null
  }, [query.data, id])
  return { ...query, data }
}

/**
 * Hook to validate recruitment channel ID from URL filter using dropdown API instead of get-by-id.
 * Returns shape compatible with useRecruitmentChannel for filter validation and display.
 */
export function useRecruitmentChannelForFilter(id: number) {
  const query = useRecruitmentChannelsDropdown(id ? { id__in: [id] } : undefined, { enabled: !!id })
  const data = useMemo(() => {
    if (!query.data?.results?.length) return null
    return query.data.results.find((r) => r.id === id) ?? null
  }, [query.data, id])
  return { ...query, data }
}

/**
 * Hook to validate recruitment request ID from URL filter using dropdown API instead of get-by-id.
 * Returns shape compatible with useRecruitmentRequest for filter validation and display.
 */
export function useRecruitmentRequestForFilter(id: number) {
  const query = useRecruitmentRequestsDropdown(id ? { id__in: [id] } : undefined, { enabled: !!id })
  const data = useMemo(() => {
    if (!query.data?.results?.length) return null
    return query.data.results.find((r) => r.id === id) ?? null
  }, [query.data, id])
  return { ...query, data }
}
