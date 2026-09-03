import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Flex } from '@radix-ui/themes'
import { useDebounceValue } from 'usehooks-ts'
import { parse } from 'date-fns'
import { PAGE_SIZE, PAGE_SIZES } from '@/constants/table.ts'
import { DATE_SERVER_FORMAT } from '@/constants/date-format.ts'
import { parsePositiveInt } from '@/utils/common.ts'
import { formatDateToApi } from '@/utils/date-utils.ts'
import { PageTitle } from '@/components/ui'
import AppDialog from '@/components/dialog/AppDialog.tsx'
import RecruitmentCandidateTable from '@/features/recruitment/candidate/view/RecruitmentCandidateTable.tsx'
import RecruitmentCandidateFilterForm, {
  type RecruitmentCandidateFilterFormRef,
} from '@/features/recruitment/candidate/_shares/components/RecruitmentCandidateFilterForm.tsx'
import {
  type GetRecruitmentCandidatesParams,
  type RecruitmentCandidate,
  useRecruitmentCandidates,
} from '@/features/recruitment/services/recruitment-candidate-service'
import {
  useBranchForFilter,
  useBlockForFilter,
  useDepartmentForFilter,
  useRecruitmentRequestForFilter,
} from '@/hooks/useFilterEntityValidation'
import { useRecruitmentCandidateDelete } from '@/features/recruitment/candidate/_shares/hooks/useRecruitmentCandidateDelete.tsx'
import { useRecruitmentCandidateExport } from '@/features/recruitment/candidate/_shares/hooks/useRecruitmentCandidateExport.tsx'
import { useRecruitmentCandidateImport } from '@/features/recruitment/candidate/_shares/hooks'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
import { useAbility } from '@/lib/ability.ts'
import { APP_PATH } from '@/routes'
import { RecruitmentCandidateEmployeeType } from '@/constants/api-schema-aliases'

type FilterParams = {
  dateRange?: { from?: Date; to?: Date } | null
  onboardDateRange?: { from?: Date; to?: Date } | null
  statuses?: string[]
  employee_types?: string[]
  is_return_candidate?: 'true' | 'false' | null
  is_employee_created?: 'true' | 'false' | null
  recruitment_request?: number | null
  branch?: number
  block?: number
  department?: number
  recruitment_source?: number
  recruitment_channel?: number
}

function parseFilterParamsFromUrl(
  searchParams: URLSearchParams,
  allowedStatuses?: string[]
): FilterParams {
  const params: FilterParams = {}

  const submittedFrom = searchParams.get('submitted_date_from')
  const submittedTo = searchParams.get('submitted_date_to')
  if (submittedFrom || submittedTo) {
    try {
      params.dateRange = {
        from: submittedFrom ? parse(submittedFrom, DATE_SERVER_FORMAT, new Date()) : undefined,
        to: submittedTo ? parse(submittedTo, DATE_SERVER_FORMAT, new Date()) : undefined,
      }
    } catch {
      // ignore parse error
    }
  }

  const onboardFrom = searchParams.get('onboard_date_from')
  const onboardTo = searchParams.get('onboard_date_to')
  if (onboardFrom || onboardTo) {
    try {
      params.onboardDateRange = {
        from: onboardFrom ? parse(onboardFrom, DATE_SERVER_FORMAT, new Date()) : undefined,
        to: onboardTo ? parse(onboardTo, DATE_SERVER_FORMAT, new Date()) : undefined,
      }
    } catch {
      // ignore parse error
    }
  }

  const statusIn = searchParams.get('status__in')
  let statuses: string[] = []

  if (statusIn) {
    statuses = statusIn.split(',').filter((s) => s.trim() !== '')
  } else {
    // Fallback to legacy format support
    statuses = searchParams.getAll('status').filter((s) => s.trim() !== '')
  }

  if (allowedStatuses && allowedStatuses.length > 0) {
    statuses = statuses.filter((s) => allowedStatuses.includes(s))
  }
  if (statuses.length > 0) {
    params.statuses = statuses
  }

  const branchId = parsePositiveInt(searchParams.get('branch'))
  if (branchId) params.branch = branchId
  const blockId = parsePositiveInt(searchParams.get('block'))
  if (blockId) params.block = blockId
  const departmentId = parsePositiveInt(searchParams.get('department'))
  if (departmentId) params.department = departmentId
  const recruitmentSourceId = parsePositiveInt(searchParams.get('recruitment_source'))
  if (recruitmentSourceId) params.recruitment_source = recruitmentSourceId
  const recruitmentChannelId = parsePositiveInt(searchParams.get('recruitment_channel'))
  if (recruitmentChannelId) params.recruitment_channel = recruitmentChannelId

  const employeeTypeIn = searchParams.get('employee_type__in')
  let employeeTypes: string[] = []
  if (employeeTypeIn) {
    employeeTypes = employeeTypeIn.split(',').filter((s) => s.trim() !== '')
  } else {
    const employeeType = searchParams.get('employee_type')
    if (employeeType) {
      employeeTypes = [employeeType]
    }
  }
  if (employeeTypes.length > 0) {
    params.employee_types = employeeTypes
  }

  const isReturnCandidate = (searchParams.get('is_return_candidate') ?? '').trim().toLowerCase()
  if (isReturnCandidate === 'true' || isReturnCandidate === 'false') {
    params.is_return_candidate = isReturnCandidate
  }

  const isEmployeeCreated = (searchParams.get('is_employee_created') ?? '').trim().toLowerCase()
  if (isEmployeeCreated === 'true' || isEmployeeCreated === 'false') {
    params.is_employee_created = isEmployeeCreated
  }

  return params
}

type RecruitmentCandidatesQueryParams = NonNullable<GetRecruitmentCandidatesParams>

function buildApiParamsFromUrl(
  searchParams: URLSearchParams,
  allowedStatuses?: string[],
  validatedBranchId?: number,
  validatedBlockId?: number,
  validatedDepartmentId?: number
): RecruitmentCandidatesQueryParams {
  const params: RecruitmentCandidatesQueryParams = {}

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

  const search = searchParams.get('search')
  if (search) {
    params.search = search
  }

  const submittedFrom = searchParams.get('submitted_date_from')
  if (submittedFrom) {
    params.submitted_date__gte = submittedFrom
  }
  const submittedTo = searchParams.get('submitted_date_to')
  if (submittedTo) {
    params.submitted_date__lte = submittedTo
  }

  const onboardFrom = searchParams.get('onboard_date_from')
  if (onboardFrom) {
    params.onboard_date__gte = onboardFrom
  }
  const onboardTo = searchParams.get('onboard_date_to')
  if (onboardTo) {
    params.onboard_date__lte = onboardTo
  }

  const statusIn = searchParams.get('status__in')
  let statuses: string[] = []

  if (statusIn) {
    statuses = statusIn.split(',').filter((s) => s.trim() !== '')
  } else {
    statuses = searchParams.getAll('status').filter((s) => s.trim() !== '')
  }

  if (allowedStatuses && allowedStatuses.length > 0) {
    statuses = statuses.filter((s) => allowedStatuses.includes(s))
  }

  if (statuses.length > 0) {
    params.status__in = statuses
  }

  if (validatedBranchId) params.branch = validatedBranchId
  if (validatedBlockId) params.block = validatedBlockId
  if (validatedDepartmentId) params.department = validatedDepartmentId

  const recruitmentSourceId = parsePositiveInt(searchParams.get('recruitment_source'))
  if (recruitmentSourceId) params.recruitment_source = recruitmentSourceId
  const recruitmentChannelId = parsePositiveInt(searchParams.get('recruitment_channel'))
  if (recruitmentChannelId) params.recruitment_channel = recruitmentChannelId

  const employeeTypeIn = searchParams.get('employee_type__in')
  if (employeeTypeIn) {
    const values = employeeTypeIn.split(',').filter((s) => s.trim() !== '')
    if (values.length > 0) {
      ;(params as Record<string, unknown>).employee_type__in = values
    }
  } else {
    const employeeType = searchParams.get('employee_type')
    if (employeeType) {
      params.employee_type = employeeType as RecruitmentCandidateEmployeeType
    }
  }

  const isReturnCandidate = (searchParams.get('is_return_candidate') ?? '').trim().toLowerCase()
  if (isReturnCandidate === 'true') params.is_return_candidate = true
  if (isReturnCandidate === 'false') params.is_return_candidate = false

  const isEmployeeCreated = (searchParams.get('is_employee_created') ?? '').trim().toLowerCase()
  if (isEmployeeCreated === 'true') params.is_employee_created = true
  if (isEmployeeCreated === 'false') params.is_employee_created = false

  return params
}

export default function RecruitmentCandidatePage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const formRef = useRef<RecruitmentCandidateFilterFormRef>(null)
  const ability = useAbility()

  const [isUrlReady, setIsUrlReady] = useState(false)
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)

  const initialSearchTerm = searchParams.get('search') || ''
  const [searchInput, setSearchInput] = useState(initialSearchTerm)
  const [debouncedSearch] = useDebounceValue(searchInput, 500)

  const { openDeleteDialog } = useRecruitmentCandidateDelete()
  const { openExportDialog } = useRecruitmentCandidateExport()
  const { openImportDialog } = useRecruitmentCandidateImport()

  const { keysMapOptions } = useAppConstant({
    module: 'hrm',
    keys: [APP_CONSTANT_KEY.RECRUITMENT.CANDIDATE.STATUS],
  })

  const allowedStatusValues = useMemo(() => {
    if (!keysMapOptions.has(APP_CONSTANT_KEY.RECRUITMENT.CANDIDATE.STATUS)) {
      return [] as string[]
    }
    const opts =
      (keysMapOptions.get(APP_CONSTANT_KEY.RECRUITMENT.CANDIDATE.STATUS) as
        | { value: string; label: string }[]
        | undefined) || []
    return opts.map((opt) => String(opt.value))
  }, [keysMapOptions])

  // ===== Validate recruitment_request ID from URL =====
  const recruitmentRequestIdFromUrl = parsePositiveInt(searchParams.get('recruitment_request'))
  const recruitmentRequestQuery = useRecruitmentRequestForFilter(recruitmentRequestIdFromUrl ?? 0)
  const isRecruitmentRequestValid = !!recruitmentRequestQuery.data

  const isRecruitmentRequestValidationLoading = useMemo(() => {
    return !!recruitmentRequestIdFromUrl && recruitmentRequestQuery.isLoading
  }, [recruitmentRequestIdFromUrl, recruitmentRequestQuery.isLoading])

  // ===== Cascade validation (branch, block, department) =====
  const rawBranchId = parsePositiveInt(searchParams.get('branch'))
  const rawBlockId = parsePositiveInt(searchParams.get('block'))
  const rawDepartmentId = parsePositiveInt(searchParams.get('department'))

  const branchQuery = useBranchForFilter(rawBranchId ?? 0)
  const isBranchValid = !!branchQuery.data

  const blockQuery = useBlockForFilter(rawBlockId ?? 0, rawBranchId)
  const isBlockValid = isBranchValid && !!blockQuery.data && blockQuery.data.branch === rawBranchId

  const departmentQuery = useDepartmentForFilter(rawDepartmentId ?? 0, rawBranchId, rawBlockId)
  const isDepartmentValid = isBlockValid && !!departmentQuery.data

  const validatedBranchId = isBranchValid ? rawBranchId : undefined
  const validatedBlockId = isBlockValid ? rawBlockId : undefined
  const validatedDepartmentId = isDepartmentValid ? rawDepartmentId : undefined

  const isCascadeValidationLoading = useMemo(() => {
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

  // Initialize URL with defaults when empty; ensure page/page_size when URL has other params
  useEffect(() => {
    const actualUrlSearch = window.location.search
    const actualUrlParams = new URLSearchParams(actualUrlSearch)
    const isUrlEmpty = actualUrlParams.toString() === '' && searchParams.toString() === ''

    const hasPage = searchParams.has('page') || actualUrlParams.has('page')
    const hasPageSize = searchParams.has('page_size') || actualUrlParams.has('page_size')

    if (isUrlEmpty) {
      const newParams = new URLSearchParams()
      newParams.set('page', '1')
      newParams.set('page_size', String(PAGE_SIZE))
      setSearchParams(newParams, { replace: true })
    } else if (!hasPage || !hasPageSize) {
      const newParams = new URLSearchParams(searchParams)
      if (!hasPage) newParams.set('page', '1')
      if (!hasPageSize) newParams.set('page_size', String(PAGE_SIZE))
      setSearchParams(newParams, { replace: true })
    }

    setIsUrlReady(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sync search input when URL changes (e.g., browser back/forward)
  useEffect(() => {
    const urlSearchTerm = searchParams.get('search') || ''
    if (urlSearchTerm !== searchInput && urlSearchTerm !== debouncedSearch) {
      setSearchInput(urlSearchTerm)
    }
  }, [searchParams])

  // Update URL when debounced search changes
  useEffect(() => {
    if (!isUrlReady) return

    const currentSearchTerm = searchParams.get('search') || ''
    if (debouncedSearch !== currentSearchTerm) {
      const newParams = new URLSearchParams(searchParams)
      if (debouncedSearch) {
        newParams.set('search', debouncedSearch)
      } else {
        newParams.delete('search')
      }
      newParams.set('page', '1')
      setSearchParams(newParams, { replace: true })
    }
  }, [debouncedSearch, isUrlReady, searchParams, setSearchParams])

  const isQueryReady =
    isUrlReady && !isRecruitmentRequestValidationLoading && !isCascadeValidationLoading

  const apiParams = useMemo(() => {
    if (!isQueryReady) return undefined

    const params = buildApiParamsFromUrl(
      searchParams,
      allowedStatusValues,
      validatedBranchId,
      validatedBlockId,
      validatedDepartmentId
    )

    // Only add validated recruitment_request ID to API params
    if (isRecruitmentRequestValid && recruitmentRequestIdFromUrl) {
      ;(params as Record<string, unknown>).recruitment_request = recruitmentRequestIdFromUrl
    }

    return params
  }, [
    isQueryReady,
    searchParams,
    allowedStatusValues,
    isRecruitmentRequestValid,
    recruitmentRequestIdFromUrl,
    validatedBranchId,
    validatedBlockId,
    validatedDepartmentId,
  ])

  const {
    data: recruitmentCandidatesData,
    isLoading,
    error,
  } = useRecruitmentCandidates(apiParams as GetRecruitmentCandidatesParams | undefined)

  const currentFilterParams = useMemo(() => {
    const parsed = parseFilterParamsFromUrl(searchParams, allowedStatusValues)
    return {
      ...parsed,
      recruitment_request: isRecruitmentRequestValid ? recruitmentRequestIdFromUrl : undefined,
      branch: validatedBranchId,
      block: validatedBlockId,
      department: validatedDepartmentId,
      recruitment_source: parsed.recruitment_source,
      recruitment_channel: parsed.recruitment_channel,
    }
  }, [
    searchParams,
    allowedStatusValues,
    isRecruitmentRequestValid,
    recruitmentRequestIdFromUrl,
    validatedBranchId,
    validatedBlockId,
    validatedDepartmentId,
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
    const formData = formRef.current?.getValues?.()
    if (!formData) return

    const newParams = new URLSearchParams()
    newParams.set('page', '1')
    newParams.set('page_size', String(pageSize))

    const search = searchParams.get('search')
    if (search) {
      newParams.set('search', search)
    }

    const ordering = searchParams.get('ordering')
    if (ordering) {
      newParams.set('ordering', ordering)
    }

    if (formData.dateRange?.from) {
      newParams.set('submitted_date_from', formatDateToApi(formData.dateRange.from))
    }
    if (formData.dateRange?.to) {
      newParams.set('submitted_date_to', formatDateToApi(formData.dateRange.to))
    }
    if (formData.onboardDateRange?.from) {
      newParams.set('onboard_date_from', formatDateToApi(formData.onboardDateRange.from))
    }
    if (formData.onboardDateRange?.to) {
      newParams.set('onboard_date_to', formatDateToApi(formData.onboardDateRange.to))
    }

    if (formData.statuses && formData.statuses.length > 0) {
      const validStatuses = formData.statuses.filter((s: string) => !!s)
      if (validStatuses.length > 0) {
        newParams.set('status__in', validStatuses.join(','))
      }
    }
    if (formData.employee_types && formData.employee_types.length > 0) {
      const validEmployeeTypes = formData.employee_types.filter((s: string) => !!s)
      if (validEmployeeTypes.length > 0) {
        newParams.set('employee_type__in', validEmployeeTypes.join(','))
      }
    }

    if (formData.is_return_candidate === 'true' || formData.is_return_candidate === 'false') {
      newParams.set('is_return_candidate', formData.is_return_candidate)
    }

    if (formData.is_employee_created === 'true' || formData.is_employee_created === 'false') {
      newParams.set('is_employee_created', formData.is_employee_created)
    }

    if (formData.recruitment_request) {
      newParams.set('recruitment_request', String(formData.recruitment_request))
    }

    if (formData.branch) {
      newParams.set('branch', String(formData.branch))
    }
    if (formData.block) {
      newParams.set('block', String(formData.block))
    }
    if (formData.department) {
      newParams.set('department', String(formData.department))
    }
    if (formData.recruitment_source) {
      newParams.set('recruitment_source', String(formData.recruitment_source))
    }
    if (formData.recruitment_channel) {
      newParams.set('recruitment_channel', String(formData.recruitment_channel))
    }

    setSearchParams(newParams, { replace: true })
    setIsFilterDialogOpen(false)
  }, [pageSize, searchParams, setSearchParams])

  const handleClearAll = useCallback(() => {
    setSearchInput('')
    const newParams = new URLSearchParams()
    newParams.set('page', '1')
    newParams.set('page_size', String(PAGE_SIZE))
    setSearchParams(newParams, { replace: true })
  }, [setSearchParams])

  const handleCreateNew = useCallback(() => {
    navigate(APP_PATH.RECRUITMENT_CANDIDATE_CREATE, {
      state: { from: window.location.pathname + window.location.search },
    })
  }, [navigate])

  const handleDeleteRecruitmentCandidate = useCallback(
    (candidate: RecruitmentCandidate) => {
      openDeleteDialog(candidate)
    },
    [openDeleteDialog]
  )

  const handleExport = useCallback(() => {
    const exportParams = {
      ...currentFilterParams,
      recruitment_request: currentFilterParams.recruitment_request ?? undefined,
    } as any
    openExportDialog(searchInput, exportParams)
  }, [openExportDialog, searchInput, currentFilterParams])

  const handleImport = useCallback(() => {
    openImportDialog()
  }, [openImportDialog])

  const filterBadgeCount = useMemo(() => {
    let count = 0
    if (currentFilterParams.dateRange?.from || currentFilterParams.dateRange?.to) count++
    if (currentFilterParams.onboardDateRange?.from || currentFilterParams.onboardDateRange?.to)
      count++
    if (currentFilterParams.statuses && currentFilterParams.statuses.length > 0) count++
    if (currentFilterParams.employee_types && currentFilterParams.employee_types.length > 0) count++
    if (
      currentFilterParams.is_return_candidate === 'true' ||
      currentFilterParams.is_return_candidate === 'false'
    )
      count++
    if (
      currentFilterParams.is_employee_created === 'true' ||
      currentFilterParams.is_employee_created === 'false'
    )
      count++
    if (currentFilterParams.recruitment_request) count++
    if (currentFilterParams.branch || currentFilterParams.block || currentFilterParams.department) {
      count++
    }
    if (currentFilterParams.recruitment_source) count++
    if (currentFilterParams.recruitment_channel) count++
    return count
  }, [currentFilterParams])

  const { tableData, pageCount, totalRecords } = useMemo(() => {
    const results = recruitmentCandidatesData?.results ?? []
    const count = recruitmentCandidatesData?.count ?? 0

    const mapped: RecruitmentCandidate[] = results.map((item) => ({
      ...item,
      recruitment_request_name: item.recruitment_request?.name ?? '-',
      recruitment_source_name: item.recruitment_source?.name ?? '-',
      recruitment_channel_name: item.recruitment_channel?.name ?? '-',
    }))

    return {
      tableData: mapped,
      pageCount: Math.ceil(count / pageSize) || 1,
      totalRecords: count,
    }
  }, [recruitmentCandidatesData, pageSize])

  const isTableLoading = isLoading

  const formInitialValues = useMemo(() => {
    return {
      dateRange: currentFilterParams.dateRange || null,
      onboardDateRange: currentFilterParams.onboardDateRange ?? null,
      statuses: currentFilterParams.statuses || [],
      employee_types: currentFilterParams.employee_types || [],
      is_return_candidate: currentFilterParams.is_return_candidate ?? null,
      is_employee_created: currentFilterParams.is_employee_created ?? null,
      recruitment_request: currentFilterParams.recruitment_request || null,
      branch: currentFilterParams.branch,
      block: currentFilterParams.block,
      department: currentFilterParams.department,
      recruitment_source: currentFilterParams.recruitment_source ?? null,
      recruitment_channel: currentFilterParams.recruitment_channel ?? null,
    }
  }, [currentFilterParams])

  return (
    <>
      <PageTitle
        handleSearch={setSearchInput}
        searchPlaceholder="Tìm kiếm theo mã, tên ứng viên"
        searchClassName={'!w-[350px]'}
        handleFilter={handleOpenFilterDialog}
        filterBadgeCount={filterBadgeCount}
        handleCreateNew={
          ability.can('create', 'recruitment_candidate') ? handleCreateNew : undefined
        }
        handleExportBtnFull={
          ability.can('export', 'recruitment_candidate') ? handleExport : undefined
        }
        handleImportBtnFull={
          ability.can('import_template', 'recruitment_candidate') ? handleImport : undefined
        }
      />
      <Flex flexGrow={'1'} direction="column" gap="0" className="pb-6">
        <div className="flex-1 overflow-x-auto overflow-y-auto border-solid pt-0 pb-10">
          <RecruitmentCandidateTable
            data={tableData}
            isLoading={isTableLoading}
            error={error as any}
            pageCount={pageCount}
            pageSize={pageSize}
            currentPage={currentPage}
            totalRecords={totalRecords}
            onPaginationChange={handlePaginationChange}
            onSortingChange={handleSortingChange}
            onDeleteRecruitmentCandidate={handleDeleteRecruitmentCandidate}
            onClearFilter={handleClearAll}
            hasFilter={!!searchInput || filterBadgeCount > 0}
          />
        </div>
      </Flex>

      <AppDialog
        variant="filter"
        open={isFilterDialogOpen}
        onOpenChange={setIsFilterDialogOpen}
        content={<RecruitmentCandidateFilterForm ref={formRef} initialValues={formInitialValues} />}
        onClearFilter={handleClearFilterInDialog}
        onConfirm={handleApplyFilter}
        onCancel={handleCloseFilterDialog}
      />
    </>
  )
}
