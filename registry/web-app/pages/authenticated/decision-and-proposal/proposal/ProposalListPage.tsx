import { useCallback, useState, useEffect, useMemo, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Flex } from '@radix-ui/themes'
import { format, parse, startOfMonth, endOfMonth } from 'date-fns'
import { PageTitle } from '@/components/ui'
import ProposalListTable from '@/features/decision-and-proposal/proposal/manage/view/ProposalListTable'
import {
  useProposals,
  type GetProposalsParams,
} from '@/features/decision-and-proposal/services/proposal-base-service'
import {
  useBranchForFilter,
  useBlockForFilter,
  useDepartmentForFilter,
  usePositionForFilter,
  useEmployeeForFilter,
} from '@/hooks/useFilterEntityValidation'
import { useDebounceValue } from 'usehooks-ts'
import { DATE_SERVER_FORMAT } from '@/constants/date-format'
import { PAGE_SIZE, PAGE_SIZES } from '@/constants/table'
import { formatDateToApi } from '@/utils/date-utils'
import { parsePositiveInt } from '@/utils/common'
import AppDialog from '@/components/dialog/AppDialog'
import ProposalsFilterForm, {
  type ProposalsFilterFormRef,
} from '@/features/decision-and-proposal/proposal/_shares/components/ProposalsFilterForm'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import useAppConstant from '@/hooks/useAppConstant'
import { ProposalType } from '@/constants/api-schema-aliases'

type FilterParams = {
  dateRange?: { from?: Date; to?: Date } | null
  branchId?: number
  blockId?: number
  departmentId?: number
  positionId?: number
  employeeId?: number
  status?: string[]
  proposalType?: string[]
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
      // ignore parse errors
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

  const statuses = getParamAsList(searchParams, 'status')
  if (statuses.length > 0) params.status = statuses

  const proposalTypes = getParamAsList(searchParams, 'proposal_type')
  if (proposalTypes.length > 0) params.proposalType = proposalTypes

  const verifierStatuses = [
    ...getParamAsList(searchParams, 'verifiers__status__in'),
    ...getParamAsList(searchParams, 'verifier_status'),
  ]
  if (verifierStatuses.length > 0) params.verifierStatus = verifierStatuses

  return params
}

function buildApiParamsFromUrl(searchParams: URLSearchParams): NonNullable<GetProposalsParams> {
  const params: NonNullable<GetProposalsParams> = {}

  const page = parsePositiveInt(searchParams.get('page'))
  if (page) params.page = page

  const pageSizeFromUrl = parsePositiveInt(searchParams.get('page_size'))
  const safePageSize =
    pageSizeFromUrl && PAGE_SIZES.includes(pageSizeFromUrl) ? pageSizeFromUrl : PAGE_SIZE
  params.page_size = safePageSize

  const ordering = searchParams.get('ordering')
  if (ordering) params.ordering = ordering

  const fromDate = searchParams.get('from_date')
  if (fromDate) params.proposal_date__gte = fromDate
  const toDate = searchParams.get('to_date')
  if (toDate) params.proposal_date__lte = toDate

  const statuses = getParamAsList(searchParams, 'status')
  if (statuses.length > 0) {
    params.proposal_status__in = statuses
  }

  const proposalTypes = getParamAsList(searchParams, 'proposal_type')
  if (proposalTypes.length > 0) {
    params.proposal_type__in = proposalTypes
  }

  const verifierStatuses = [
    ...getParamAsList(searchParams, 'verifiers__status__in'),
    ...getParamAsList(searchParams, 'verifier_status'),
  ]
  if (verifierStatuses.length > 0) {
    params.verifiers__status__in = verifierStatuses
  }

  const searchTerm = searchParams.get('search_term')
  if (searchTerm) params.search = searchTerm

  return params
}

function getParamAsList(searchParams: URLSearchParams, key: string): string[] {
  return (
    searchParams
      .get(key)
      ?.split(',')
      .map((s) => s.trim())
      .filter(Boolean) ?? []
  )
}

function getDefaultDateRange(): { from: string; to: string } {
  const now = new Date()
  const from = format(startOfMonth(now), DATE_SERVER_FORMAT)
  const to = format(endOfMonth(now), DATE_SERVER_FORMAT)
  return { from, to }
}

export default function ProposalListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const formRef = useRef<ProposalsFilterFormRef>(null)

  const [isUrlReady, setIsUrlReady] = useState(false)
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)

  const initialSearchTerm = searchParams.get('search_term') || ''
  const [searchInput, setSearchInput] = useState(initialSearchTerm)
  const [debouncedSearch] = useDebounceValue(searchInput, 500)

  const { keysMapOptions } = useAppConstant({
    module: 'hrm',
    keys: [
      APP_CONSTANT_KEY.HRM.PROPOSAL_PROPOSAL_STATUS_CHOICES,
      APP_CONSTANT_KEY.HRM.PROPOSAL_TYPE,
      APP_CONSTANT_KEY.HRM.PROPOSAL_VERIFIER_STATUS_CHOICES,
    ],
  })

  const validStatusValues = useMemo(() => {
    const options = keysMapOptions.get(APP_CONSTANT_KEY.HRM.PROPOSAL_PROPOSAL_STATUS_CHOICES) || []
    return new Set(options.map((opt: { value: string }) => opt.value))
  }, [keysMapOptions])

  const validProposalTypeValues = useMemo(() => {
    const options = keysMapOptions.get(APP_CONSTANT_KEY.HRM.PROPOSAL_TYPE) || []
    return new Set(options.map((opt: { value: string }) => opt.value))
  }, [keysMapOptions])

  const validVerifierStatusValues = useMemo(() => {
    const options = keysMapOptions.get(APP_CONSTANT_KEY.HRM.PROPOSAL_VERIFIER_STATUS_CHOICES) || []
    return new Set(options.map((opt: { value: string }) => opt.value))
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

  const validatedFilterParams = useMemo(
    () => ({
      branchId: isBranchValid ? branchIdFromUrl : undefined,
      blockId: isBlockValid ? blockIdFromUrl : undefined,
      departmentId: isDepartmentValid ? departmentIdFromUrl : undefined,
      positionId: isPositionValid ? positionIdFromUrl : undefined,
      employeeId: isEmployeeValid ? employeeIdFromUrl : undefined,
    }),
    [
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
    ]
  )

  const isFilterValidationLoading = useMemo(() => {
    return (
      (!!branchIdFromUrl && branchQuery.isLoading) ||
      (!!blockIdFromUrl && isBranchValid && blockQuery.isLoading) ||
      (!!departmentIdFromUrl && isBlockValid && departmentQuery.isLoading) ||
      (!!positionIdFromUrl && positionQuery.isLoading) ||
      (!!employeeIdFromUrl && employeeQuery.isLoading)
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
    const hasDate =
      searchParams.has('from_date') ||
      actualUrlParams.has('from_date') ||
      searchParams.has('to_date') ||
      actualUrlParams.has('to_date')
    const hasStatus = searchParams.has('status') || actualUrlParams.has('status')

    const DEFAULT_STATUS_PENDING = 'pending'

    if (isUrlEmpty) {
      const newParams = new URLSearchParams()
      newParams.set('page', '1')
      newParams.set('page_size', String(PAGE_SIZE))
      const { from, to } = getDefaultDateRange()
      newParams.set('from_date', from)
      newParams.set('to_date', to)
      newParams.set('status', DEFAULT_STATUS_PENDING)
      setSearchParams(newParams, { replace: true })
    } else {
      const needsPageOrSize = !hasPage || !hasPageSize
      const needsDateOrStatus = !hasDate || !hasStatus
      const needsUpdate = isNavigateBack ? needsPageOrSize : needsPageOrSize || needsDateOrStatus
      if (needsUpdate) {
        const newParams = new URLSearchParams(searchParams)
        if (!hasPage) newParams.set('page', '1')
        if (!hasPageSize) newParams.set('page_size', String(PAGE_SIZE))
        if (!isNavigateBack) {
          if (!hasDate) {
            const { from, to } = getDefaultDateRange()
            newParams.set('from_date', from)
            newParams.set('to_date', to)
          }
          if (!hasStatus) newParams.set('status', DEFAULT_STATUS_PENDING)
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

    const statusesFromUrl = getParamAsList(searchParams, 'status')
    const validStatuses = statusesFromUrl.filter((s) => validStatusValues.has(s))
    if (validStatuses.length > 0) {
      baseParams.proposal_status__in = validStatuses
    } else if (statusesFromUrl.length > 0) {
      delete baseParams.proposal_status__in
    }

    const proposalTypesFromUrl = getParamAsList(searchParams, 'proposal_type')
    const validProposalTypes = proposalTypesFromUrl.filter((t) => validProposalTypeValues.has(t))
    if (validProposalTypes.length > 0) {
      baseParams.proposal_type__in = validProposalTypes
    } else if (proposalTypesFromUrl.length > 0) {
      delete baseParams.proposal_type__in
    }

    const verifierStatusesFromUrl = [
      ...getParamAsList(searchParams, 'verifiers__status__in'),
      ...getParamAsList(searchParams, 'verifier_status'),
    ]
    const validVerifierStatuses = verifierStatusesFromUrl.filter((s) =>
      validVerifierStatusValues.has(s)
    )
    if (validVerifierStatuses.length > 0) {
      baseParams.verifiers__status__in = validVerifierStatuses
    } else if (verifierStatusesFromUrl.length > 0) {
      delete baseParams.verifiers__status__in
    }

    baseParams.exclude_proposal_type = [ProposalType.asset_allocation]

    return baseParams
  }, [
    searchParams,
    isQueryReady,
    validatedFilterParams,
    validStatusValues,
    validProposalTypeValues,
    validVerifierStatusValues,
  ])

  const {
    data: proposalsData,
    isLoading,
    error,
    isFetching,
    isRefetching,
  } = useProposals(isQueryReady && !!apiParams ? apiParams : undefined)

  const currentFilterParams = useMemo(() => {
    const urlParams = parseFilterParamsFromUrl(searchParams)
    const validStatuses = urlParams.status?.filter((s) => validStatusValues.has(s)) || []
    const validProposalTypes =
      urlParams.proposalType?.filter((t) => validProposalTypeValues.has(t)) || []
    const validVerifierStatuses =
      urlParams.verifierStatus?.filter((s) => validVerifierStatusValues.has(s)) || []

    return {
      ...urlParams,
      ...validatedFilterParams,
      status: validStatuses.length > 0 ? validStatuses : undefined,
      proposalType: validProposalTypes.length > 0 ? validProposalTypes : undefined,
      verifierStatus: validVerifierStatuses.length > 0 ? validVerifierStatuses : undefined,
    }
  }, [
    searchParams,
    validatedFilterParams,
    validStatusValues,
    validProposalTypeValues,
    validVerifierStatusValues,
  ])

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

  const handleOpenFilterDialog = useCallback(() => setIsFilterDialogOpen(true), [])
  const handleCloseFilterDialog = useCallback(() => setIsFilterDialogOpen(false), [])
  const handleClearFilterInDialog = useCallback(() => formRef.current?.clearForm(), [])

  const handleApplyFilter = useCallback(() => {
    const formData = formRef.current?.getRawValues?.()
    if (!formData) return

    const newParams = new URLSearchParams()
    newParams.set('page', '1')
    newParams.set('page_size', String(pageSize))

    const search = searchParams.get('search_term')
    if (search) newParams.set('search_term', search)
    const ordering = searchParams.get('ordering')
    if (ordering) newParams.set('ordering', ordering)

    if (formData.date_range?.from) {
      newParams.set('from_date', formatDateToApi(formData.date_range.from))
    }
    if (formData.date_range?.to) {
      newParams.set('to_date', formatDateToApi(formData.date_range.to))
    }
    if (formData.branch_id) newParams.set('branch', String(formData.branch_id))
    if (formData.block_id) newParams.set('block', String(formData.block_id))
    if (formData.department_id) newParams.set('department', String(formData.department_id))
    if (formData.position_id) newParams.set('position', String(formData.position_id))
    if (formData.employee_id) newParams.set('employee', String(formData.employee_id))

    if (formData.status && Array.isArray(formData.status) && formData.status.length > 0) {
      const validStatuses = formData.status.filter((s: string) => validStatusValues.has(s))
      if (validStatuses.length > 0) {
        newParams.set('status', validStatuses.join(','))
      }
    }
    if (
      formData.proposal_type &&
      Array.isArray(formData.proposal_type) &&
      formData.proposal_type.length > 0
    ) {
      const validProposalTypes = formData.proposal_type.filter((t: string) =>
        validProposalTypeValues.has(t)
      )
      if (validProposalTypes.length > 0) {
        newParams.set('proposal_type', validProposalTypes.join(','))
      }
    }
    if (
      formData.verifier_status &&
      Array.isArray(formData.verifier_status) &&
      formData.verifier_status.length > 0
    ) {
      const validVerifierStatuses = formData.verifier_status.filter((s: string) =>
        validVerifierStatusValues.has(s)
      )
      if (validVerifierStatuses.length > 0) {
        newParams.set('verifiers__status__in', validVerifierStatuses.join(','))
      }
    }

    setSearchParams(newParams, { replace: true })
    setIsFilterDialogOpen(false)
  }, [
    searchParams,
    setSearchParams,
    pageSize,
    validStatusValues,
    validProposalTypeValues,
    validVerifierStatusValues,
  ])

  const handleClearAll = useCallback(() => {
    setSearchInput('')
    const newParams = new URLSearchParams()
    newParams.set('page', '1')
    newParams.set('page_size', String(PAGE_SIZE))
    const { from, to } = getDefaultDateRange()
    newParams.set('from_date', from)
    newParams.set('to_date', to)
    newParams.set('status', 'pending')
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
    if (currentFilterParams.status?.length) count++
    if (currentFilterParams.proposalType?.length) count++
    if (currentFilterParams.verifierStatus?.length) count++
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

  const formInitialValues = useMemo(
    () => ({
      date_range: currentFilterParams.dateRange || null,
      branch_id: currentFilterParams.branchId,
      block_id: currentFilterParams.blockId,
      department_id: currentFilterParams.departmentId,
      position_id: currentFilterParams.positionId,
      employee_id: currentFilterParams.employeeId,
      status: currentFilterParams.status || [],
      proposal_type: currentFilterParams.proposalType || [],
      verifier_status: currentFilterParams.verifierStatus || [],
    }),
    [currentFilterParams]
  )

  return (
    <>
      <PageTitle
        handleSearch={setSearchInput}
        searchValue={searchInput}
        searchPlaceholder="Tìm kiếm đề xuất, nhân viên đề xuất"
        searchClassName="!w-[356px]"
        handleFilter={handleOpenFilterDialog}
        filterBadgeCount={activeFilterCount}
      />
      <Flex flexGrow="1" direction="column" gap="0" className="pb-6">
        <div className="flex-1 overflow-x-auto overflow-y-auto border-solid pt-0 pb-10">
          <ProposalListTable
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
        </div>
      </Flex>

      <AppDialog
        variant="filter"
        open={isFilterDialogOpen}
        onOpenChange={setIsFilterDialogOpen}
        title="Bộ lọc"
        content={
          <ProposalsFilterForm
            key={isFilterDialogOpen ? 'filter-open' : 'filter-closed'}
            ref={formRef}
            initialValues={formInitialValues}
            showProposalType={true}
            showVerifierStatus={true}
            excludeProposalTypes={['asset_allocation']}
          />
        }
        onClearFilter={handleClearFilterInDialog}
        onConfirm={handleApplyFilter}
        onCancel={handleCloseFilterDialog}
      />
    </>
  )
}
