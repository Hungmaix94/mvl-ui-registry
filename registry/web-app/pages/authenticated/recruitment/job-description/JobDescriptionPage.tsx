import { useCallback, useState, useEffect, useMemo, useRef } from 'react'
import { PageTitle } from '@/components/ui'
import { Flex } from '@radix-ui/themes'
import { JobDescriptionTable } from '@/features/recruitment/job-description'
import { useJobDescriptionDelete } from '@/features/recruitment/job-description'
import {
  type GetJobDescriptionsParams,
  type JobDescription,
  useJobDescriptions,
  useJobDescriptionExport,
} from '@/features/recruitment/services/job-description-service'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { APP_PATH } from '@/routes'
import { useDebounceValue } from 'usehooks-ts'
import { PAGE_SIZE, PAGE_SIZES } from '@/constants/table.ts'
import { formatDateToApi } from '@/utils/date-utils.ts'
import { parsePositiveInt } from '@/utils/common.ts'
import { useAbility } from '@/lib/ability.ts'
import AppDialog from '@/components/dialog/AppDialog.tsx'
import JobDescriptionFilterForm, {
  type JobDescriptionFilterFormRef,
} from '@/features/recruitment/job-description/_shares/components/JobDescriptionFilterForm.tsx'
import { parse } from 'date-fns'
import { DATE_SERVER_FORMAT } from '@/constants/date-format.ts'

type FilterParams = {
  dateRange?: { from?: Date; to?: Date } | null
}

/**
 * Parse filter params from URL search params
 */
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

  return params
}

/**
 * Build API params from URL search params
 */
function buildApiParamsFromUrl(searchParams: URLSearchParams): GetJobDescriptionsParams {
  const params: GetJobDescriptionsParams = {}

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

  // Filter params - created_at date range
  const fromDate = searchParams.get('from_date')
  if (fromDate) {
    params.created_at__date__gte = fromDate
  }

  const toDate = searchParams.get('to_date')
  if (toDate) {
    params.created_at__date__lte = toDate
  }

  return params
}

const JobDescriptionPage = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const formRef = useRef<JobDescriptionFilterFormRef>(null)
  const ability = useAbility()

  const { openDeleteDialog } = useJobDescriptionDelete()
  const { openExportDialog } = useJobDescriptionExport()

  // Track if URL has been initialized with defaults
  const [isUrlReady, setIsUrlReady] = useState(false)

  // Filter dialog state
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)

  // Local search input state (for controlled input)
  const initialSearchTerm = searchParams.get('search') || ''
  const [searchInput, setSearchInput] = useState(initialSearchTerm)
  const [debouncedSearch] = useDebounceValue(searchInput, 500)

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
  }, []) // Only run once on mount

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
      // Reset to page 1 when search changes
      newParams.set('page', '1')
      setSearchParams(newParams, { replace: true })
    }
  }, [debouncedSearch, isUrlReady, searchParams, setSearchParams])

  // Build API params from URL + local state
  const apiParams = useMemo(() => {
    if (!isUrlReady) return undefined

    return buildApiParamsFromUrl(searchParams)
  }, [searchParams, isUrlReady])

  const {
    data: jobDescriptionsResponse,
    isLoading,
    error,
  } = useJobDescriptions(apiParams, {
    enabled: isUrlReady && !!apiParams,
  })

  const currentPage = parsePositiveInt(searchParams.get('page')) ?? 1
  const pageSizeFromUrl = parsePositiveInt(searchParams.get('page_size'))
  const pageSize =
    pageSizeFromUrl && PAGE_SIZES.includes(pageSizeFromUrl) ? pageSizeFromUrl : PAGE_SIZE

  const { jobDescriptions, totalRecords, pageCount } = useMemo(() => {
    const totalCount = jobDescriptionsResponse?.count || 0

    return {
      jobDescriptions: jobDescriptionsResponse?.results || [],
      totalRecords: totalCount,
      pageCount: Math.ceil(totalCount / pageSize) || 1,
    }
  }, [jobDescriptionsResponse?.results, jobDescriptionsResponse?.count, pageSize])

  const currentFilterParams: FilterParams = useMemo(() => {
    return parseFilterParamsFromUrl(searchParams)
  }, [searchParams])

  const handleSearch = useCallback((query: string) => {
    setSearchInput(query)
  }, [])

  const handleCreateNew = useCallback(() => {
    navigate(APP_PATH.RECRUITMENT_JOB_DESCRIPTION_CREATE)
  }, [navigate])

  const handleDeleteJobDescription = useCallback(
    (jobDescription: JobDescription) => {
      openDeleteDialog(jobDescription)
    },
    [openDeleteDialog]
  )

  const handleClearFilter = useCallback(() => {
    setSearchInput('')
    const newParams = new URLSearchParams()
    newParams.set('page', '1')
    newParams.set('page_size', String(PAGE_SIZE))
    setSearchParams(newParams, { replace: true })
  }, [setSearchParams])

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

    // Keep non-filter params
    newParams.set('page', '1') // Reset to page 1 when filter changes
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
      newParams.set('from_date', formatDateToApi(formData.dateRange.from))
    }
    if (formData.dateRange?.to) {
      newParams.set('to_date', formatDateToApi(formData.dateRange.to))
    }

    setSearchParams(newParams, { replace: true })

    setIsFilterDialogOpen(false)
  }, [searchParams, setSearchParams])

  const handleExport = useCallback(() => {
    openExportDialog({ search: searchInput || undefined })
  }, [openExportDialog, searchInput])

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (currentFilterParams.dateRange?.from || currentFilterParams.dateRange?.to) count++
    return count
  }, [currentFilterParams])

  return (
    <>
      <PageTitle
        handleSearch={handleSearch}
        searchPlaceholder="Tìm kiếm theo mã JD, tiêu đề"
        searchClassName="!w-[350px]"
        searchValue={searchInput}
        handleFilter={handleOpenFilterDialog}
        filterBadgeCount={activeFilterCount}
        handleCreateNew={ability.can('create', 'job_description') ? handleCreateNew : undefined}
        handleExportBtnFull={ability.can('export', 'job_description') ? handleExport : undefined}
      />
      <Flex flexGrow={'1'} direction="column" gap="4" className={'pb-6'}>
        <JobDescriptionTable
          data={jobDescriptions}
          isLoading={isLoading}
          error={error as Error | null}
          pageCount={pageCount}
          pageSize={pageSize}
          currentPage={currentPage}
          totalRecords={totalRecords}
          onPaginationChange={(pageIndex, newPageSize) => {
            const newParams = new URLSearchParams(searchParams)
            newParams.set('page', String(pageIndex + 1))
            newParams.set('page_size', String(newPageSize))
            setSearchParams(newParams, { replace: true })
          }}
          onSortingChange={() => {
            // Sorting is not URL-driven for this page per requirements.
          }}
          onDeleteJobDescription={handleDeleteJobDescription}
          onClearFilter={handleClearFilter}
          hasFilter={!!searchInput || activeFilterCount > 0}
        />
      </Flex>
      <AppDialog
        variant="filter"
        open={isFilterDialogOpen}
        onOpenChange={setIsFilterDialogOpen}
        content={<JobDescriptionFilterForm ref={formRef} initialValues={currentFilterParams} />}
        onClearFilter={handleClearFilterInDialog}
        onConfirm={handleApplyFilter}
        onCancel={handleCloseFilterDialog}
      />
    </>
  )
}

export default JobDescriptionPage
