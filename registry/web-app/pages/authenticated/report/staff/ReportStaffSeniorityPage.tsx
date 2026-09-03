import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Flex } from '@radix-ui/themes'
import { PageTitle } from '@/components/ui'
import EmployeeSeniorityFilterForm, {
  type EmployeeSeniorityFilterFormRef,
} from '@/features/report/staff/seniority/EmployeeSeniorityFilterForm.tsx'
import EmployeeSeniorityTable from '@/features/report/staff/seniority/EmployeeSeniorityTable.tsx'
import {
  useEmployeeSeniorityReport,
  useExportEmployeeSeniorityReport,
  type GetEmployeeSeniorityReportParams,
} from '@/services'
import {
  useBranchForFilter,
  useBlockForFilter,
  useDepartmentForFilter,
} from '@/hooks/useFilterEntityValidation'
import { PAGE_SIZE, PAGE_SIZES } from '@/constants/table'
import { useAbility } from '@/lib/ability.ts'
import { parsePositiveInt } from '@/utils/common'
import AppDialog from '@/components/dialog/AppDialog'
import { BlockType } from '@/constants/api-schema-aliases'
const VALID_BLOCK_TYPES = [BlockType.business, BlockType.support] as const

/**
 * Parse filter params from URL for form display
 */
function parseFilterParamsFromUrl(searchParams: URLSearchParams) {
  const params: {
    branchId?: number
    blockId?: number
    departmentId?: number
    blockTypes: string[]
  } = {
    blockTypes: [],
  }

  // Cascade IDs
  params.branchId = parsePositiveInt(searchParams.get('branch')) ?? undefined
  params.blockId = parsePositiveInt(searchParams.get('block')) ?? undefined
  params.departmentId = parsePositiveInt(searchParams.get('department')) ?? undefined

  // Block types - validate against enum
  const blockTypesFromUrl = searchParams.getAll('function_block')
  if (blockTypesFromUrl.length > 0) {
    params.blockTypes = blockTypesFromUrl.filter((bt) =>
      VALID_BLOCK_TYPES.includes(bt as BlockType)
    )
  }

  return params
}

/**
 * Build API params from URL
 */
function buildApiParamsFromUrl(
  searchParams: URLSearchParams,
  validatedBranchId?: number,
  validatedBlockId?: number,
  validatedDepartmentId?: number,
  validatedBlockTypes?: string[]
): GetEmployeeSeniorityReportParams {
  const params: GetEmployeeSeniorityReportParams = {}

  // Pagination
  const page = parsePositiveInt(searchParams.get('page'))
  if (page) params.page = page

  const pageSizeFromUrl = parsePositiveInt(searchParams.get('page_size'))
  const pageSize =
    pageSizeFromUrl && PAGE_SIZES.includes(pageSizeFromUrl) ? pageSizeFromUrl : PAGE_SIZE
  params.page_size = pageSize

  // Cascade IDs (validated)
  if (validatedBranchId) params.branch_id = validatedBranchId
  if (validatedBlockId) params.block_id = validatedBlockId
  if (validatedDepartmentId) params.department_id = validatedDepartmentId

  // Function block - only set if exactly one valid type
  if (validatedBlockTypes && validatedBlockTypes.length === 1) {
    params.function_block = validatedBlockTypes[0]
  }

  return params
}

const ReportStaffSeniorityPage = () => {
  const ability = useAbility()
  const [searchParams, setSearchParams] = useSearchParams()
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const filterFormRef = useRef<EmployeeSeniorityFilterFormRef>(null)

  // Track if URL has been initialized
  const [isUrlReady, setIsUrlReady] = useState(false)

  // Parse URL params
  const urlParams = useMemo(() => parseFilterParamsFromUrl(searchParams), [searchParams])

  // Initialize URL with defaults when empty
  useEffect(() => {
    const actualUrlSearch = window.location.search
    const actualUrlParams = new URLSearchParams(actualUrlSearch)
    const isUrlEmpty = actualUrlParams.toString() === '' && searchParams.toString() === ''

    if (isUrlEmpty) {
      const newParams = new URLSearchParams()
      newParams.set('page', '1')
      newParams.set('page_size', String(PAGE_SIZE))
      setSearchParams(newParams, { replace: true })
    }

    setIsUrlReady(true)
  }, [])

  // === CASCADE VALIDATION ===
  const rawBranchId = urlParams.branchId
  const rawBlockId = urlParams.blockId
  const rawDepartmentId = urlParams.departmentId

  const branchQuery = useBranchForFilter(rawBranchId ?? 0)
  const isBranchValid = !!branchQuery.data

  const blockQuery = useBlockForFilter(rawBlockId ?? 0, rawBranchId)
  const isBlockValid = isBranchValid && !!blockQuery.data && blockQuery.data.branch === rawBranchId

  const departmentQuery = useDepartmentForFilter(rawDepartmentId ?? 0, rawBranchId, rawBlockId)
  const isDepartmentValid = isBlockValid && !!departmentQuery.data

  // Get validated IDs
  const validatedBranchId = isBranchValid ? rawBranchId : undefined
  const validatedBlockId = isBlockValid ? rawBlockId : undefined
  const validatedDepartmentId = isDepartmentValid ? rawDepartmentId : undefined

  // Validate block types (already filtered in parseFilterParamsFromUrl)
  const validatedBlockTypes = urlParams.blockTypes

  // Check if validation is loading
  const isFilterValidationLoading = useMemo(() => {
    if (rawBranchId && branchQuery.isLoading) return true
    if (rawBlockId && isBranchValid && blockQuery.isLoading) return true
    if (rawDepartmentId && isBlockValid && departmentQuery.isLoading) return true
    return false
  }, [
    rawBranchId,
    rawBlockId,
    rawDepartmentId,
    branchQuery.isLoading,
    blockQuery.isLoading,
    departmentQuery.isLoading,
    isBranchValid,
    isBlockValid,
  ])

  // Build API params
  const apiParams = useMemo(() => {
    if (!isUrlReady || isFilterValidationLoading) return undefined
    return buildApiParamsFromUrl(
      searchParams,
      validatedBranchId,
      validatedBlockId,
      validatedDepartmentId,
      validatedBlockTypes
    )
  }, [
    searchParams,
    isUrlReady,
    isFilterValidationLoading,
    validatedBranchId,
    validatedBlockId,
    validatedDepartmentId,
    validatedBlockTypes,
  ])

  // API call
  const { data: seniorityData, isLoading } = useEmployeeSeniorityReport(apiParams, {
    enabled: isUrlReady && !isFilterValidationLoading && !!apiParams,
  })

  // Handle apply filter
  const handleApplyFilter = useCallback(() => {
    const formData = filterFormRef.current?.getValues()
    if (!formData) return

    const newParams = new URLSearchParams()

    // Keep pagination from URL
    const currentPageSize = searchParams.get('page_size') || String(PAGE_SIZE)
    newParams.set('page', '1') // Reset to page 1 when filter changes
    newParams.set('page_size', currentPageSize)

    // Cascade IDs
    if (formData.branch) {
      newParams.set('branch', String(formData.branch))
    }
    if (formData.block) {
      newParams.set('block', String(formData.block))
    }
    if (formData.department) {
      newParams.set('department', String(formData.department))
    }

    // Function block (multi-select)
    if (formData.block_types && formData.block_types.length > 0) {
      formData.block_types.forEach((bt) => {
        newParams.append('function_block', bt)
      })
    }

    setSearchParams(newParams, { replace: true })
    setIsFilterOpen(false)
  }, [searchParams, setSearchParams])

  // Handle clear filter
  const handleClearFilter = useCallback(() => {
    filterFormRef.current?.clearForm()
  }, [])

  // Get pagination info from URL
  const currentPage = parsePositiveInt(searchParams.get('page')) ?? 1
  const pageSizeFromUrl = parsePositiveInt(searchParams.get('page_size'))
  const pageSize =
    pageSizeFromUrl && PAGE_SIZES.includes(pageSizeFromUrl) ? pageSizeFromUrl : PAGE_SIZE

  // Handle pagination change
  const handlePaginationChange = useCallback(
    (pageIndex: number, newPageSize: number) => {
      const newParams = new URLSearchParams(searchParams)
      newParams.set('page', String(pageIndex + 1))
      newParams.set('page_size', String(newPageSize))
      setSearchParams(newParams, { replace: true })
    },
    [searchParams, setSearchParams]
  )

  // Filter count - only count valid filters that are actually used in API
  const filterBadgeCount = useMemo(() => {
    let count = 0
    if (validatedBranchId) count++
    if (validatedBlockId) count++
    if (validatedDepartmentId) count++
    if (validatedBlockTypes.length > 0) count++
    return count
  }, [validatedBranchId, validatedBlockId, validatedDepartmentId, validatedBlockTypes.length])

  const { employees, totalRecords, pageCount } = useMemo(() => {
    return {
      employees: seniorityData?.results ?? [],
      totalRecords: seniorityData?.count ?? 0,
      pageCount: Math.ceil((seniorityData?.count ?? 0) / pageSize) || 1,
    }
  }, [seniorityData, pageSize])

  const { openExportDialog } = useExportEmployeeSeniorityReport()

  const handleExport = useCallback(() => {
    if (!apiParams) return
    openExportDialog(apiParams)
  }, [apiParams, openExportDialog])

  // Form initial values
  const formInitialValues = useMemo(
    () => ({
      branch: validatedBranchId,
      block: validatedBlockId,
      department: validatedDepartmentId,
      branchName: branchQuery.data?.name,
      blockName: blockQuery.data?.name,
      departmentName: departmentQuery.data?.name,
      block_types: validatedBlockTypes,
    }),
    [
      validatedBranchId,
      validatedBlockId,
      validatedDepartmentId,
      branchQuery.data?.name,
      blockQuery.data?.name,
      departmentQuery.data?.name,
      validatedBlockTypes,
    ]
  )

  return (
    <>
      <PageTitle
        handleFilter={() => setIsFilterOpen(true)}
        filterBadgeCount={filterBadgeCount}
        handleExportBtnFull={
          ability.can('export', 'employee_seniority_report') ? handleExport : undefined
        }
      />

      <Flex flexGrow={'1'} direction="column" gap="0" className="pb-6">
        <div className="flex-1 overflow-x-auto overflow-y-auto border-solid pt-0 pb-10">
          <EmployeeSeniorityTable
            data={employees}
            isLoading={isLoading || isFilterValidationLoading}
            enablePagination
            pageSize={pageSize}
            manualPagination
            currentPageIndex={currentPage - 1}
            pageCount={pageCount}
            totalRecords={totalRecords}
            onPaginationChange={handlePaginationChange}
          />
        </div>
      </Flex>

      <AppDialog
        variant="filter"
        open={isFilterOpen}
        onOpenChange={setIsFilterOpen}
        title="Bộ lọc"
        content={
          <EmployeeSeniorityFilterForm
            ref={filterFormRef}
            initialValues={formInitialValues}
            onApply={() => {}}
          />
        }
        onConfirm={handleApplyFilter}
        onCancel={() => setIsFilterOpen(false)}
        onClearFilter={handleClearFilter}
      />
    </>
  )
}

export default ReportStaffSeniorityPage
