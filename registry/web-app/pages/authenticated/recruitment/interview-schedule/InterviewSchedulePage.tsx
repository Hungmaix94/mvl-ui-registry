import { useCallback, useState, useEffect, useMemo, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { PageTitle } from '@/components/ui'
import { Flex } from '@radix-ui/themes'
import {
  InterviewScheduleTable,
  useInterviewScheduleDelete,
  useInterviewScheduleExport,
  useInterviewInviteDialog,
} from '@/features/recruitment/interview-schedule'
import InterviewScheduleFilterForm, {
  type InterviewScheduleFilterFormRef,
} from '@/features/recruitment/interview-schedule/_shares/components/InterviewScheduleFilterForm.tsx'
import {
  type InterviewSchedule,
  type GetInterviewSchedulesParams,
  useInterviewSchedules,
} from '@/features/recruitment/services/interview-service'
import { APP_PATH } from '@/routes'
import { useAbility } from '@/lib/ability.ts'
import { useDebounceValue } from 'usehooks-ts'
import { parse } from 'date-fns'
import { DATE_SERVER_FORMAT } from '@/constants/date-format.ts'
import { PAGE_SIZE, PAGE_SIZES } from '@/constants/table.ts'
import { formatDateToApi } from '@/utils/date-utils.ts'
import { parsePositiveInt } from '@/utils/common.ts'
import AppDialog from '@/components/dialog/AppDialog.tsx'

type FilterParams = {
  dateRange?: { from?: Date; to?: Date } | null
}

/**
 * Parse filter params from URL search params (for form display)
 */
function parseFilterParamsFromUrl(searchParams: URLSearchParams): FilterParams {
  const params: FilterParams = {}

  const fromDate = searchParams.get('time_after')
  const toDate = searchParams.get('time_before')
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

  return params
}

/**
 * Build API params from URL search params
 */
function buildApiParamsFromUrl(
  searchParams: URLSearchParams
): NonNullable<GetInterviewSchedulesParams> {
  const params: NonNullable<GetInterviewSchedulesParams> = {}

  // Pagination
  const page = parsePositiveInt(searchParams.get('page'))
  if (page) params.page = page

  const pageSizeFromUrl = parsePositiveInt(searchParams.get('page_size'))
  const safePageSize =
    pageSizeFromUrl && PAGE_SIZES.includes(pageSizeFromUrl) ? pageSizeFromUrl : PAGE_SIZE
  params.page_size = safePageSize

  // Ordering - URL format: -field for desc, field for asc
  const ordering = searchParams.get('ordering')
  if (ordering) {
    params.ordering = ordering
  }

  // Search
  const search = searchParams.get('search')
  if (search) {
    params.search = search
  }

  // Filter params - date range
  const fromDate = searchParams.get('time_after')
  if (fromDate) {
    params.time_after = fromDate
  }

  const toDate = searchParams.get('time_before')
  if (toDate) {
    params.time_before = toDate
  }

  return params
}

const InterviewSchedulePage = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const formRef = useRef<InterviewScheduleFilterFormRef>(null)
  const ability = useAbility()

  // Track if URL has been initialized with defaults
  const [isUrlReady, setIsUrlReady] = useState(false)

  // Filter dialog state
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)

  // Local search input state (for controlled input)
  const initialSearchTerm = searchParams.get('search') || ''
  const [searchInput, setSearchInput] = useState(initialSearchTerm)
  const [debouncedSearch] = useDebounceValue(searchInput, 500)

  const { openDeleteDialog } = useInterviewScheduleDelete()
  const { openExportDialog, isExporting } = useInterviewScheduleExport()
  const { openInterviewInviteDialog } = useInterviewInviteDialog()

  const canSendInterviewInvite =
    ability.can('interview_invite_preview', 'interview_schedule') &&
    ability.can('interview_invite_send', 'interview_schedule')

  // Initialize URL with defaults if empty (only on direct access, not navigate back)
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
  }, [debouncedSearch, isUrlReady])

  // Build API params from URL
  const apiParams = useMemo(() => {
    if (!isUrlReady) return undefined
    return buildApiParamsFromUrl(searchParams)
  }, [searchParams, isUrlReady])

  // Call API with params derived from URL
  const {
    data: schedulesData,
    isLoading,
    error,
    isFetching,
    isRefetching,
  } = useInterviewSchedules(apiParams, {
    enabled: isUrlReady && !!apiParams,
  })

  // Parse current filter params from URL for dialog
  const currentFilterParams = useMemo(() => {
    return parseFilterParamsFromUrl(searchParams)
  }, [searchParams])

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

  // Handle sorting change
  const handleSortingChange = useCallback(
    (field: string, direction: 'asc' | 'desc' | null) => {
      const newParams = new URLSearchParams(searchParams)
      if (!field || !direction) {
        newParams.set('ordering', '-time')
      } else {
        const supportedFields = ['title', 'time', 'location']
        if (!supportedFields.includes(field)) {
          return
        }
        const ordering = direction === 'desc' ? `-${field}` : field
        newParams.set('ordering', ordering)
      }
      newParams.set('page', '1')
      setSearchParams(newParams, { replace: true })
    },
    [searchParams, setSearchParams]
  )

  // Handle filter dialog open
  const handleOpenFilterDialog = useCallback(() => {
    setIsFilterDialogOpen(true)
  }, [])

  // Handle filter dialog close (cancel)
  const handleCloseFilterDialog = useCallback(() => {
    setIsFilterDialogOpen(false)
  }, [])

  // Handle clear filter in dialog (only clears form, doesn't close dialog or call API)
  const handleClearFilterInDialog = useCallback(() => {
    formRef.current?.clearForm()
  }, [])

  // Handle apply filter (updates URL and closes dialog)
  const handleApplyFilter = useCallback(() => {
    const formData = formRef.current?.getValues?.()
    if (!formData) return

    const newParams = new URLSearchParams()

    // Keep non-filter params
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

    // Add filter params from form
    if (formData.dateRange?.from) {
      newParams.set('time_after', formatDateToApi(formData.dateRange.from))
    }
    if (formData.dateRange?.to) {
      newParams.set('time_before', formatDateToApi(formData.dateRange.to))
    }

    setSearchParams(newParams, { replace: true })
    setIsFilterDialogOpen(false)
  }, [searchParams, setSearchParams, pageSize])

  // Handle clear all (search + filters) - reset to defaults
  const handleClearAll = useCallback(() => {
    setSearchInput('')
    const newParams = new URLSearchParams()
    newParams.set('page', '1')
    newParams.set('page_size', String(PAGE_SIZE))
    setSearchParams(newParams, { replace: true })
  }, [setSearchParams])

  const handleCreateNew = useCallback(() => {
    navigate(APP_PATH.RECRUITMENT_INTERVIEW_SCHEDULE_CREATE, {
      state: { from: window.location.pathname + window.location.search },
    })
  }, [navigate])

  const handleDeleteInterviewSchedule = useCallback(
    (schedule: InterviewSchedule) => {
      openDeleteDialog(schedule)
    },
    [openDeleteDialog]
  )

  const handleEmail = useCallback(
    (schedule: InterviewSchedule) => {
      if (!canSendInterviewInvite) return
      openInterviewInviteDialog(schedule)
    },
    [canSendInterviewInvite, openInterviewInviteDialog]
  )

  const handleExport = useCallback(async () => {
    if (isExporting) return
    await openExportDialog({
      title: searchInput || undefined,
      time_after: searchParams.get('time_after') || undefined,
      time_before: searchParams.get('time_before') || undefined,
    })
  }, [isExporting, openExportDialog, searchInput, searchParams])

  // Calculate active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (currentFilterParams.dateRange?.from || currentFilterParams.dateRange?.to) count++
    return count
  }, [currentFilterParams])

  // Transform data for table
  const { tableData, pageCount } = useMemo(() => {
    const results = schedulesData?.results ?? []
    const count = schedulesData?.count ?? 0

    return {
      tableData: results,
      pageCount: Math.ceil(count / pageSize) || 1,
    }
  }, [schedulesData, pageSize])

  const isTableLoading = isLoading || isFetching || isRefetching

  // Convert currentFilterParams to form initialValues format
  const formInitialValues = useMemo(() => {
    return {
      dateRange: currentFilterParams.dateRange || undefined,
    }
  }, [currentFilterParams])

  return (
    <>
      <PageTitle
        searchPlaceholder="Tìm kiếm theo tiêu đề, vị trí"
        searchClassName="!w-[350px]"
        handleSearch={setSearchInput}
        searchValue={searchInput}
        handleFilter={handleOpenFilterDialog}
        filterBadgeCount={activeFilterCount}
        handleExportBtnFull={ability.can('export', 'interview_schedule') ? handleExport : undefined}
        handleCreateNew={ability.can('create', 'interview_schedule') ? handleCreateNew : undefined}
      />
      <Flex flexGrow={'1'} direction="column" gap="4" className={'pb-6'}>
        <InterviewScheduleTable
          data={tableData}
          isLoading={isTableLoading}
          error={error}
          pageCount={pageCount}
          pageSize={pageSize}
          currentPage={currentPage}
          onPaginationChange={handlePaginationChange}
          onSortingChange={handleSortingChange}
          onDeleteInterviewSchedule={handleDeleteInterviewSchedule}
          onSendInterviewInvite={handleEmail}
          canSendInterviewInvite={canSendInterviewInvite}
          onClearFilter={handleClearAll}
          hasFilter={!!searchInput || activeFilterCount > 0}
        />
      </Flex>

      {/* Filter Dialog using AppDialog with variant='filter' */}
      <AppDialog
        variant="filter"
        open={isFilterDialogOpen}
        onOpenChange={setIsFilterDialogOpen}
        content={<InterviewScheduleFilterForm ref={formRef} initialValues={formInitialValues} />}
        onClearFilter={handleClearFilterInDialog}
        onConfirm={handleApplyFilter}
        onCancel={handleCloseFilterDialog}
      />
    </>
  )
}

export default InterviewSchedulePage
