import { useMemo } from 'react'
import { useBranches, type Branch } from '@/features/org/services/branch-service'
import { useBlocks, type Block, type GetBlocksParams } from '@/features/org/services/block-service'
import { useDepartments, type Department } from '@/features/org/services/department-service'
import { createOptions } from '@/utils'
import { BlockType } from '../constants/api-schema-aliases'
export default function useOrganization({
  branch,
  block,
  blockType,
  fetchBranches = true,
  fetchBlocks = true,
  fetchDepartments = true,
}: {
  branch?: number
  block?: number
  blockType?: BlockType
  fetchBranches?: boolean
  fetchBlocks?: boolean
  fetchDepartments?: boolean
}) {
  const { data: branchesData, isLoading: isBranchesLoading } = useBranches(undefined, {
    enabled: fetchBranches,
  })
  const branches = useMemo(() => branchesData?.results || [], [branchesData?.results])
  const branchOptions = useMemo(() => createOptions<Branch>(branches), [branches])

  const blockQueryParams = useMemo<GetBlocksParams | undefined>(() => {
    if (!branch) {
      return undefined
    }
    const params: GetBlocksParams = {
      branch,
    }

    if (blockType) {
      params.block_type = blockType
    }

    return params
  }, [branch, blockType])

  const { data: blocksData, isLoading: isBlocksLoading } = useBlocks(
    blockQueryParams,
    fetchBlocks && !!branch
  )
  const blocks = useMemo(() => blocksData?.results || [], [blocksData?.results])
  const blockOptions = useMemo(() => createOptions<Block>(blocks), [blocks])

  const { data: departmentsData, isLoading: isDepartmentsLoading } = useDepartments(
    { branch, block },
    fetchDepartments && !!branch && !!block
  )
  const departments = useMemo(() => departmentsData?.results || [], [departmentsData?.results])
  const departmentOptions = useMemo(() => createOptions<Department>(departments), [departments])

  return {
    branches,
    isBranchesLoading,
    branchOptions,

    blocks,
    isBlocksLoading,
    blockOptions,

    departments,
    isDepartmentsLoading,
    departmentOptions,
  }
}
