import { useCallback, useState, useEffect, useMemo, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Flex } from '@radix-ui/themes'
import { PageTitle } from '@/components/ui'
import ReturnToWorkTable from '@/features/decision-and-proposal/proposal/return-to-work/view/ReturnToWorkTable.tsx'
import {
  useProposalsReturnToWork,
  type GetProposalsReturnToWorkParams,
} from '@/features/decision-and-proposal/services/proposal-misc-service'
import {
  useBranchForFilter,
  useBlockForFilter,
  useDepartmentForFilter,
  usePositionForFilter,
  useEmployeeForFilter,
} from '@/hooks/useFilterEntityValidation'
import { useProposalReturnToWorkExport } from '@/features/decision-and-proposal/proposal/return-to-work/hooks/useProposalReturnToWorkExport.tsx'
import { useAbility } from '@/lib/ability.ts'
import { useDebounceValue } from 'usehooks-ts'
import { parse } from 'date-fns'
import { DATE_SERVER_FORMAT } from '@/constants/date-format.ts'
import { PAGE_SIZE, PAGE_SIZES } from '@/constants/table.ts'
import { formatDateToApi } from '@/utils/date-utils.ts'
import { parsePositiveInt } from '@/utils/common.ts'
import AppDialog from '@/components/dialog/AppDialog.tsx'
import ProposalsFilterForm, {
  type ProposalsFilterFormRef,
} from '@/features/decision-and-proposal/proposal/_shares/components/ProposalsFilterForm.tsx'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
import useAppConstant from '@/hooks/useAppConstant.ts'

type FilterParams = {
  dateRange?: { from?: Date; to?: Date } | null
  branchId?: number
  blockId?: number
  departmentId?: number
  positionId?: number
  employeeId?: number
  status?: string[]
  verifierStatus?: string[]
}

function parseFilterParamsFromUrl(searchParams: URLSearchParams): FilterParams {
  const params: FilterParams = {}

  const fromDate = searchParams.get('from_date')
  const toDate = searchParams.get('to_date')
  if (fromDate || toDate) {
    try {
      params.dateRange = {
        from: fromDate ? parse(fromDate, DATE_SERVER_FORMAT, new Date()) : undefined,
        to: toDate ? parse(toDate, DATE_SERVER_FORMAT, new Date()) : undefined,
      }
    } catch {
      // If parsing fails, leave as undefined
    }
  }

  const branchId = parsePositiveInt(searchParams.get('branch'))
  if (branchId) params.branchId = branchId

  const blockId = parsePositiveInt(searchParams.get('block'))
  if (blockId) params.blockId = blockId

  const departmentId = parsePositiveInt(searchParams.get('department'))
  if (departmentId) params.departmentId = departmentId

  const positionId = parsePositiveInt(searchParams.get('position'))
  if (positionId) params.positionId = positionId

  const employeeId = parsePositiveInt(searchParams.get('employee'))
  if (employeeId) params.employeeId = employeeId

  const statuses = searchParams.getAll('status')
  if (statuses.length > 0) {
    params.status = statuses
  }

  const verifierStatuses = searchParams.getAll('verifier_status')
  if (verifierStatuses.length > 0) {
    params.verifierStatus = verifierStatuses
  }

  return params
}

function buildApiParamsFromUrl(
  searchParams: URLSearchParams
): NonNullable<GetProposalsReturnToWorkParams> {
  const params: NonNullable<GetProposalsReturnToWorkParams> = {}

  const page = parsePositiveInt(searchParams.get('page'))
  if (page) params.page = page

  const pageSizeFromUrl = parsePositiveInt(searchParams.get('page_size'))
  const safePageSize =
    pageSizeFromUrl && PAGE_SIZES.includes(pageSizeFromUrl) ? pageSizeFromUrl : PAGE_SIZE
  params.page_size = safePageSize

  const ordering = searchParams.get('ordering')
  if (ordering) {
    params.ordering = ordering
  }

  const search = searchParams.get('search_term')
  if (search) {
    params.search = search
  }

  const fromDate = searchParams.get('from_date')
  if (fromDate) {
    params.proposal_date__gte = fromDate
  }

  const toDate = searchParams.get('to_date')
  if (toDate) {
    params.proposal_date__lte = toDate
  }

  const statuses = searchParams.getAll('status')
  if (statuses.length > 0) {
    params.proposal_status__in = statuses
  }

  const verifierStatuses = searchParams.getAll('verifier_status')
  if (verifierStatuses.length > 0) {
    params.verifiers__status__in = verifierStatuses
  }

  return params
}

export default function ProposalReturnToWorkPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const formRef = useRef<ProposalsFilterFormRef>(null)
  const ability = useAbility()

  const [isUrlReady, setIsUrlReady] = useState(false)
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)

  const initialSearchTerm = searchParams.get('search_term') || ''
  const [searchInput, setSearchInput] = useState(initialSearchTerm)
  const [debouncedSearch] = useDebounceValue(searchInput, 500)

  const { openExportDialog } = useProposalReturnToWorkExport()

  const { keysMapOptions } = useAppConstant({
    module: 'hrm',
    keys: [APP_CONSTANT_KEY.HRM.PROPOSAL_PROPOSAL_STATUS_CHOICES],
  })

  const validStatusValues = useMemo(() => {
    const options = keysMapOptions.get(APP_CONSTANT_KEY.HRM.PROPOSAL_PROPOSAL_STATUS_CHOICES) || []
    return new Set(options.map((opt: any) => opt.value))
  }, [keysMapOptions])

  const branchIdFromUrl = parsePositiveInt(searchParams.get('branch'))
  const blockIdFromUrl = parsePositiveInt(searchParams.get('block'))
  const departmentIdFromUrl = parsePositiveInt(searchParams.get('department'))
  const positionIdFromUrl = parsePositiveInt(searchParams.get('position'))
  const employeeIdFromUrl = parsePositiveInt(searchParams.get('employee'))

  const branchQuery = useBranchForFilter(branchIdFromUrl ?? 0)
  const isBranchValid = !!branchQuery.data

  const blockQuery = useBlockForFilter(blockIdFromUrl ?? 0, branchIdFromUrl)
  const isBlockValid =
    isBranchValid && !!blockQuery.data && blockQuery.data.branch === branchIdFromUrl

  const departmentQuery = useDepartmentForFilter(
    departmentIdFromUrl ?? 0,
    branchIdFromUrl,
    blockIdFromUrl
  )
  const isDepartmentValid = isBlockValid && !!departmentQuery.data

  const positionQuery = usePositionForFilter(positionIdFromUrl ?? 0)
  const isPositionValid = !!positionQuery.data

  const employeeQuery = useEmployeeForFilter(employeeIdFromUrl ?? 0)
  const isEmployeeValid = !!employeeQuery.data

  const validatedFilterParams = useMemo(() => {
    return {
      branchId: isBranchValid ? branchIdFromUrl : undefined,
      blockId: isBlockValid ? blockIdFromUrl : undefined,
      departmentId: isDepartmentValid ? departmentIdFromUrl : undefined,
      positionId: isPositionValid ? positionIdFromUrl : undefined,
      employeeId: isEmployeeValid ? employeeIdFromUrl : undefined,
    }
  }, [
    isBranchValid,
    branchIdFromUrl,
    isBlockValid,
    blockIdFromUrl,
    isDepartmentValid,
    departmentIdFromUrl,
    isPositionValid,
    positionIdFromUrl,
    isEmployeeValid,
    employeeIdFromUrl,
  ])

  const isFilterValidationLoading = useMemo(() => {
    const isBranchLoading = !!branchIdFromUrl && branchQuery.isLoading
    const isBlockLoading = !!blockIdFromUrl && isBranchValid && blockQuery.isLoading
    const isDepartmentLoading = !!departmentIdFromUrl && isBlockValid && departmentQuery.isLoading
    const isPositionLoading = !!positionIdFromUrl && positionQuery.isLoading
    const isEmployeeLoading = !!employeeIdFromUrl && employeeQuery.isLoading

    return (
      isBranchLoading ||
      isBlockLoading ||
      isDepartmentLoading ||
      isPositionLoading ||
      isEmployeeLoading
    )
  }, [
    branchIdFromUrl,
    branchQuery.isLoading,
    blockIdFromUrl,
    isBranchValid,
    blockQuery.isLoading,
    departmentIdFromUrl,
    isBlockValid,
    departmentQuery.isLoading,
    positionIdFromUrl,
    positionQuery.isLoading,
    employeeIdFromUrl,
    employeeQuery.isLoading,
  ])

  useEffect(() => {
    const actualUrlSearch = window.location.search
    const actualUrlParams = new URLSearchParams(actualUrlSearch)
    const isUrlEmpty = actualUrlParams.toString() === '' && searchParams.toString() === ''

    const referrer = document.referrer
    const isNavigateBack = referrer && referrer.includes(window.location.origin)

    const hasPage = searchParams.has('page') || actualUrlParams.has('page')
    const hasPageSize = searchParams.has('page_size') || actualUrlParams.has('page_size')

    if (isUrlEmpty && !isNavigateBack) {
      const newParams = new URLSearchParams()
      newParams.set('page', '1')
      newParams.set('page_size', String(PAGE_SIZE))
      setSearchParams(newParams, { replace: true })
    } else if (isUrlEmpty && isNavigateBack) {
      const newParams = new URLSearchParams()
      newParams.set('page', '1')
      newParams.set('page_size', String(PAGE_SIZE))
      setSearchParams(newParams, { replace: true })
    } else {
      const needsUpdate = !hasPage || !hasPageSize
      if (needsUpdate) {
        const newParams = new URLSearchParams(searchParams)
        if (!hasPage) {
          newParams.set('page', '1')
        }
        if (!hasPageSize) {
          newParams.set('page_size', String(PAGE_SIZE))
        }
        setSearchParams(newParams, { replace: true })
      }
    }

    setIsUrlReady(true)
  }, [])

  useEffect(() => {
    const urlSearchTerm = searchParams.get('search_term') || ''
    if (urlSearchTerm !== searchInput && urlSearchTerm !== debouncedSearch) {
      setSearchInput(urlSearchTerm)
    }
  }, [searchParams])

  useEffect(() => {
    if (!isUrlReady) return

    const currentSearchTerm = searchParams.get('search_term') || ''
    if (debouncedSearch !== currentSearchTerm) {
      const newParams = new URLSearchParams(searchParams)
      if (debouncedSearch) {
        newParams.set('search_term', debouncedSearch)
      } else {
        newParams.delete('search_term')
      }
      newParams.set('page', '1')
      setSearchParams(newParams, { replace: true })
    }
  }, [debouncedSearch, isUrlReady, searchParams, setSearchParams])

  const isQueryReady = isUrlReady && !isFilterValidationLoading

  const apiParams = useMemo(() => {
    if (!isQueryReady) return undefined

    const baseParams = buildApiParamsFromUrl(searchParams)

    if (validatedFilterParams.branchId) {
      baseParams.created_by_branch = validatedFilterParams.branchId
    }
    if (validatedFilterParams.blockId) {
      baseParams.created_by_block = validatedFilterParams.blockId
    }
    if (validatedFilterParams.departmentId) {
      baseParams.created_by_department = validatedFilterParams.departmentId
    }
    if (validatedFilterParams.positionId) {
      baseParams.created_by_position = validatedFilterParams.positionId
    }
    if (validatedFilterParams.employeeId) {
      baseParams.created_by = validatedFilterParams.employeeId
    }

    const statusesFromUrl = searchParams.getAll('status')
    const validStatuses = statusesFromUrl.filter((s) => validStatusValues.has(s))
    if (validStatuses.length > 0) {
      baseParams.proposal_status__in = validStatuses
    } else if (statusesFromUrl.length > 0) {
      delete baseParams.proposal_status__in
    }

    return baseParams
  }, [searchParams, isQueryReady, validatedFilterParams, validStatusValues])

  const {
    data: proposalsData,
    isLoading,
    error,
    isFetching,
    isRefetching,
  } = useProposalsReturnToWork(apiParams, {
    enabled: isQueryReady && !!apiParams,
  })

  const currentFilterParams = useMemo(() => {
    const urlParams = parseFilterParamsFromUrl(searchParams)
    const validStatuses = urlParams.status?.filter((s) => validStatusValues.has(s)) || []

    return {
      ...urlParams,
      ...validatedFilterParams,
      status: validStatuses.length > 0 ? validStatuses : undefined,
    }
  }, [searchParams, validatedFilterParams, validStatusValues])

  const currentPage = parsePositiveInt(searchParams.get('page')) ?? 1
  const pageSizeFromUrl = parsePositiveInt(searchParams.get('page_size'))
  const pageSize =
    pageSizeFromUrl && PAGE_SIZES.includes(pageSizeFromUrl) ? pageSizeFromUrl : PAGE_SIZE

  const handlePaginationChange = useCallback(
    (pageIndex: number, newPageSize: number) => {
      const newParams = new URLSearchParams(searchParams)
      newParams.set('page', String(pageIndex + 1))
      newParams.set('page_size', String(newPageSize))
      setSearchParams(newParams, { replace: true })
    },
    [searchParams, setSearchParams]
  )

  const handleSortingChange = useCallback(
    (field: string, direction: 'asc' | 'desc' | null) => {
      const newParams = new URLSearchParams(searchParams)
      if (!field || !direction) {
        newParams.delete('ordering')
      } else {
        const ordering = direction === 'desc' ? `-${field}` : field
        newParams.set('ordering', ordering)
      }
      newParams.set('page', '1')
      setSearchParams(newParams, { replace: true })
    },
    [searchParams, setSearchParams]
  )

  const handleOpenFilterDialog = useCallback(() => {
    setIsFilterDialogOpen(true)
  }, [])

  const handleCloseFilterDialog = useCallback(() => {
    setIsFilterDialogOpen(false)
  }, [])

  const handleClearFilterInDialog = useCallback(() => {
    formRef.current?.clearForm()
  }, [])

  const handleApplyFilter = useCallback(() => {
    const formData = formRef.current?.getRawValues?.()
    if (!formData) return

    const newParams = new URLSearchParams()
    newParams.set('page', '1')
    newParams.set('page_size', String(pageSize))

    const search = searchParams.get('search_term')
    if (search) {
      newParams.set('search_term', search)
    }

    const ordering = searchParams.get('ordering')
    if (ordering) {
      newParams.set('ordering', ordering)
    }

    if (formData.date_range?.from) {
      newParams.set('from_date', formatDateToApi(formData.date_range.from))
    }
    if (formData.date_range?.to) {
      newParams.set('to_date', formatDateToApi(formData.date_range.to))
    }

    if (formData.branch_id) {
      newParams.set('branch', String(formData.branch_id))
    }
    if (formData.block_id) {
      newParams.set('block', String(formData.block_id))
    }
    if (formData.department_id) {
      newParams.set('department', String(formData.department_id))
    }
    if (formData.position_id) {
      newParams.set('position', String(formData.position_id))
    }
    if (formData.employee_id) {
      newParams.set('employee', String(formData.employee_id))
    }

    if (formData.status && formData.status.length > 0) {
      formData.status.forEach((status) => {
        newParams.append('status', status)
      })
    }

    if (formData.verifier_status && formData.verifier_status.length > 0) {
      formData.verifier_status.forEach((verifierStatus) => {
        newParams.append('verifier_status', verifierStatus)
      })
    }

    setSearchParams(newParams, { replace: true })
    setIsFilterDialogOpen(false)
  }, [searchParams, setSearchParams, pageSize])

  const handleClearAll = useCallback(() => {
    setSearchInput('')
    const newParams = new URLSearchParams()
    newParams.set('page', '1')
    newParams.set('page_size', String(PAGE_SIZE))
    setSearchParams(newParams, { replace: true })
  }, [setSearchParams])

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (currentFilterParams.dateRange?.from || currentFilterParams.dateRange?.to) count++
    if (currentFilterParams.branchId) count++
    if (currentFilterParams.blockId) count++
    if (currentFilterParams.departmentId) count++
    if (currentFilterParams.positionId) count++
    if (currentFilterParams.employeeId) count++
    if (currentFilterParams.status && currentFilterParams.status.length > 0) count++
    if (currentFilterParams.verifierStatus && currentFilterParams.verifierStatus.length > 0) count++
    return count
  }, [currentFilterParams])

  const { tableData, pageCount, totalRecords } = useMemo(() => {
    const results = proposalsData?.results ?? []
    const count = proposalsData?.count ?? 0

    return {
      tableData: results,
      pageCount: Math.ceil(count / pageSize) || 1,
      totalRecords: count,
    }
  }, [proposalsData, pageSize])

  const isTableLoading = isLoading || isFetching || isRefetching

  const formInitialValues = useMemo(() => {
    return {
      date_range: currentFilterParams.dateRange || null,
      branch_id: currentFilterParams.branchId,
      block_id: currentFilterParams.blockId,
      department_id: currentFilterParams.departmentId,
      position_id: currentFilterParams.positionId,
      employee_id: currentFilterParams.employeeId,
      status: currentFilterParams.status || [],
      verifier_status: currentFilterParams.verifierStatus || [],
    }
  }, [currentFilterParams])

  const handleExport = useCallback(() => {
    const exportParams: any = {
      date_range: currentFilterParams.dateRange || undefined,
      branch_id: currentFilterParams.branchId,
      block_id: currentFilterParams.blockId,
      department_id: currentFilterParams.departmentId,
      position_id: currentFilterParams.positionId,
      employee_id: currentFilterParams.employeeId,
      status: currentFilterParams.status || [],
      verifier_status: currentFilterParams.verifierStatus || [],
      proposal_date__gte: currentFilterParams.dateRange?.from
        ? formatDateToApi(currentFilterParams.dateRange.from)
        : undefined,
      proposal_date__lte: currentFilterParams.dateRange?.to
        ? formatDateToApi(currentFilterParams.dateRange.to)
        : undefined,
    }
    openExportDialog(searchInput, exportParams)
  }, [openExportDialog, searchInput, currentFilterParams])

  return (
    <>
      <PageTitle
        title="Quay lại làm việc"
        handleSearch={setSearchInput}
        searchValue={searchInput}
        searchPlaceholder="Tìm kiếm đề xuất, nhân viên đề xuất"
        searchClassName="!w-[356px]"
        handleFilter={handleOpenFilterDialog}
        filterBadgeCount={activeFilterCount}
        handleExportBtnFull={
          ability.can('export', 'proposal_return_to_work') ? handleExport : undefined
        }
      />
      <Flex flexGrow={'1'} direction="column" gap="4" className={'pb-6'}>
        <ReturnToWorkTable
          data={tableData}
          isLoading={isTableLoading}
          error={error}
          pageCount={pageCount}
          pageSize={pageSize}
          currentPage={currentPage}
          totalRecords={totalRecords}
          onPaginationChange={handlePaginationChange}
          onSortingChange={handleSortingChange}
          onClearFilter={handleClearAll}
          hasFilter={!!searchInput || activeFilterCount > 0}
        />
      </Flex>

      <AppDialog
        variant="filter"
        open={isFilterDialogOpen}
        onOpenChange={setIsFilterDialogOpen}
        title="Bộ lọc"
        content={
          <ProposalsFilterForm
            ref={formRef}
            initialValues={formInitialValues}
            showProposalType={false}
          />
        }
        onClearFilter={handleClearFilterInDialog}
        onConfirm={handleApplyFilter}
        onCancel={handleCloseFilterDialog}
      />
    </>
  )
}
