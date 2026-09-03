import { useCallback, useState, useEffect, useMemo, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { PageTitle, Button } from '@/components/ui'
import { Flex } from '@radix-ui/themes'
import { RecruitmentExpenseTable } from '@/features/recruitment/cost'
import { useRecruitmentExpenseDelete } from '@/features/recruitment/cost/_shares/hooks/useRecruitmentExpenseDelete.tsx'
import { useRecruitmentExpenseExport } from '@/features/recruitment/cost/_shares/hooks/useRecruitmentExpenseExport.tsx'
import { useRecruitmentExpenseImport } from '@/features/recruitment/cost/_shares/hooks/useRecruitmentExpenseImport.tsx'
import BulkMarkInvalidDialog from '@/features/recruitment/cost/_shares/components/BulkMarkInvalidDialog'
import {
  type RecruitmentExpense,
  type GetRecruitmentExpensesParams,
  useRecruitmentExpenses,
} from '@/features/recruitment/services/recruitment-expense-service'
import { IconCheckcircle } from '@/assets/icons'
import {
  useBranchForFilter,
  useEmployeeForFilter,
  useRecruitmentSourceForFilter,
  useRecruitmentChannelForFilter,
} from '@/hooks/useFilterEntityValidation'
import { APP_PATH } from '@/routes'
import { useAbility } from '@/lib/ability.ts'
import { useDebounceValue } from 'usehooks-ts'
import { parse } from 'date-fns'
import { DATE_SERVER_FORMAT } from '@/constants/date-format.ts'
import { PAGE_SIZE, PAGE_SIZES } from '@/constants/table.ts'
import { formatDateToApi } from '@/utils/date-utils.ts'
import { parsePositiveInt } from '@/utils/common.ts'
import AppDialog from '@/components/dialog/AppDialog.tsx'
import RecruitmentExpenseFilterForm, {
  type RecruitmentExpenseFilterFormRef,
} from '@/features/recruitment/cost/_shares/components/RecruitmentExpenseFilterForm.tsx'
import {
  DEFAULT_INVALID_REFEREE_MIN_WORKING_DAYS,
  RECRUITMENT_EXPENSE_YES_NO_VALUES,
  type TRecruitmentExpenseYesNo,
} from '@/constants/recruitment-expense-filter.ts'
import { RecruitmentExpensePaymentStatus } from '@/constants/api-schema-aliases'

type FilterParams = {
  dateRange?: { from?: Date; to?: Date } | null
  recruitmentSource?: string
  recruitmentChannel?: string
  referee?: string
  referrer?: string
  branch?: number
  paymentStatuses?: string[]
  is_valid?: TRecruitmentExpenseYesNo
  invalid_referee_in_backoffice?: TRecruitmentExpenseYesNo
  invalid_referrer_left_by_expense_date?: TRecruitmentExpenseYesNo
  invalid_referrer_was_leadership?: TRecruitmentExpenseYesNo
  invalid_referee_min_working_days?: number
}

const VALID_YES_NO_VALUES = new Set<string>([
  RECRUITMENT_EXPENSE_YES_NO_VALUES.YES,
  RECRUITMENT_EXPENSE_YES_NO_VALUES.NO,
])

function readYesNoParam(
  searchParams: URLSearchParams,
  key: string
): TRecruitmentExpenseYesNo | undefined {
  const raw = searchParams.get(key)
  if (raw && VALID_YES_NO_VALUES.has(raw)) {
    return raw as TRecruitmentExpenseYesNo
  }
  return undefined
}

/**
 * Parse filter params from URL search params (for form display only, no validation)
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

  // Parse IDs without validation (validation happens via hooks)
  const recruitmentSource = searchParams.get('recruitment_source')
  if (recruitmentSource) {
    params.recruitmentSource = recruitmentSource
  }

  const recruitmentChannel = searchParams.get('recruitment_channel')
  if (recruitmentChannel) {
    params.recruitmentChannel = recruitmentChannel
  }

  const referee = searchParams.get('referee')
  if (referee) {
    params.referee = referee
  }

  const referrer = searchParams.get('referrer')
  if (referrer) {
    params.referrer = referrer
  }

  const branchId = parsePositiveInt(searchParams.get('branch'))
  if (branchId) {
    params.branch = branchId
  }

  // Supports:
  // - `payment_statuses=EXPECTED,PAID` (preferred; multi-select)
  // - `payment_status=EXPECTED` (legacy; single-select)
  const paymentStatusesRaw = searchParams.get('payment_statuses')
  const paymentStatusesFromMulti = paymentStatusesRaw
    ? paymentStatusesRaw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : undefined

  const paymentStatusLegacy = searchParams.get('payment_status')
  const paymentStatusesFromLegacy = paymentStatusLegacy ? [paymentStatusLegacy] : undefined

  const paymentStatuses = paymentStatusesFromMulti ?? paymentStatusesFromLegacy
  if (paymentStatuses?.length) {
    params.paymentStatuses = paymentStatuses
  }

  const isValid = readYesNoParam(searchParams, 'is_valid')
  if (isValid) params.is_valid = isValid

  const invalidRefereeInBackoffice = readYesNoParam(searchParams, 'invalid_referee_in_backoffice')
  if (invalidRefereeInBackoffice) params.invalid_referee_in_backoffice = invalidRefereeInBackoffice

  const invalidReferrerLeftByExpenseDate = readYesNoParam(
    searchParams,
    'invalid_referrer_left_by_expense_date'
  )
  if (invalidReferrerLeftByExpenseDate) {
    params.invalid_referrer_left_by_expense_date = invalidReferrerLeftByExpenseDate
  }

  const invalidReferrerWasLeadership = readYesNoParam(
    searchParams,
    'invalid_referrer_was_leadership'
  )
  if (invalidReferrerWasLeadership) {
    params.invalid_referrer_was_leadership = invalidReferrerWasLeadership
  }

  const minWorkingDays = parsePositiveInt(searchParams.get('invalid_referee_min_working_days'))
  if (minWorkingDays) params.invalid_referee_min_working_days = minWorkingDays

  return params
}

/**
 * Build API params from URL search params (without validation - will be validated separately)
 */
function buildApiParamsFromUrl(
  searchParams: URLSearchParams
): NonNullable<GetRecruitmentExpensesParams> {
  const params: NonNullable<GetRecruitmentExpensesParams> = {}

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

  // Filter params - payment status (multi)
  const paymentStatusesRaw = searchParams.get('payment_statuses')
  const paymentStatusesLegacy = searchParams.get('payment_status')
  const paymentStatusesValues = paymentStatusesRaw
    ? paymentStatusesRaw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : paymentStatusesLegacy
      ? [paymentStatusesLegacy]
      : []

  if (paymentStatusesValues.length) {
    const allowed = new Set(Object.values(RecruitmentExpensePaymentStatus))
    const filtered = paymentStatusesValues.filter((s) => allowed.has(s as any))
    if (filtered.length) {
      params.payment_statuses = filtered as RecruitmentExpensePaymentStatus[]
    }
  }

  // Filter params - date range
  const fromDate = searchParams.get('from_date')
  if (fromDate) {
    params.date__gte = fromDate
  }

  const toDate = searchParams.get('to_date')
  if (toDate) {
    params.date__lte = toDate
  }

  // Filter params - validity flags (string 'true'/'false' on URL → boolean for API)
  const isValidRaw = searchParams.get('is_valid')
  if (isValidRaw === RECRUITMENT_EXPENSE_YES_NO_VALUES.YES) params.is_valid = true
  else if (isValidRaw === RECRUITMENT_EXPENSE_YES_NO_VALUES.NO) params.is_valid = false

  const refBackofficeRaw = searchParams.get('invalid_referee_in_backoffice')
  if (refBackofficeRaw === RECRUITMENT_EXPENSE_YES_NO_VALUES.YES) {
    params.invalid_referee_in_backoffice = true
  } else if (refBackofficeRaw === RECRUITMENT_EXPENSE_YES_NO_VALUES.NO) {
    params.invalid_referee_in_backoffice = false
  }

  const refLeftRaw = searchParams.get('invalid_referrer_left_by_expense_date')
  if (refLeftRaw === RECRUITMENT_EXPENSE_YES_NO_VALUES.YES) {
    params.invalid_referrer_left_by_expense_date = true
  } else if (refLeftRaw === RECRUITMENT_EXPENSE_YES_NO_VALUES.NO) {
    params.invalid_referrer_left_by_expense_date = false
  }

  const refLeadershipRaw = searchParams.get('invalid_referrer_was_leadership')
  if (refLeadershipRaw === RECRUITMENT_EXPENSE_YES_NO_VALUES.YES) {
    params.invalid_referrer_was_leadership = true
  } else if (refLeadershipRaw === RECRUITMENT_EXPENSE_YES_NO_VALUES.NO) {
    params.invalid_referrer_was_leadership = false
  }

  const minWorkingDays = parsePositiveInt(searchParams.get('invalid_referee_min_working_days'))
  if (minWorkingDays) params.invalid_referee_min_working_days = minWorkingDays

  // Note: recruitment_source, recruitment_channel, referee & referrer will be added after validation

  return params
}

const RecruitmentExpensePage = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const formRef = useRef<RecruitmentExpenseFilterFormRef>(null)
  const ability = useAbility()

  // Track if URL has been initialized with defaults
  const [isUrlReady, setIsUrlReady] = useState(false)

  // Filter dialog state
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)

  // Bulk mode state
  const [isBulkMode, setIsBulkMode] = useState(false)
  const [selectedRows, setSelectedRows] = useState<RecruitmentExpense[]>([])
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false)

  const handleEnterBulkMode = useCallback(() => {
    setSelectedRows([])
    setIsBulkMode(true)
  }, [])

  const handleExitBulkMode = useCallback(() => {
    setIsBulkMode(false)
    setSelectedRows([])
  }, [])

  const handleOpenResetDialog = useCallback(() => {
    if (selectedRows.length === 0) return
    setIsResetDialogOpen(true)
  }, [selectedRows.length])

  const handleResetSuccess = useCallback(() => {
    setIsResetDialogOpen(false)
    setIsBulkMode(false)
    setSelectedRows([])
  }, [])

  // Local search input state (for controlled input)
  const initialSearchTerm = searchParams.get('search') || ''
  const [searchInput, setSearchInput] = useState(initialSearchTerm)
  const [debouncedSearch] = useDebounceValue(searchInput, 500)

  const { openDeleteDialog } = useRecruitmentExpenseDelete()
  const { openExportDialog } = useRecruitmentExpenseExport()
  const { openImportDialog } = useRecruitmentExpenseImport()

  // ===== Validate async select IDs from URL =====
  const recruitmentSourceIdFromUrl = parsePositiveInt(searchParams.get('recruitment_source'))
  const recruitmentChannelIdFromUrl = parsePositiveInt(searchParams.get('recruitment_channel'))
  const refereeIdFromUrl = parsePositiveInt(searchParams.get('referee'))
  const referrerIdFromUrl = parsePositiveInt(searchParams.get('referrer'))

  const sourceQuery = useRecruitmentSourceForFilter(recruitmentSourceIdFromUrl ?? 0)
  const isSourceValid = !!sourceQuery.data

  const channelQuery = useRecruitmentChannelForFilter(recruitmentChannelIdFromUrl ?? 0)
  const isChannelValid = !!channelQuery.data

  const refereeQuery = useEmployeeForFilter(refereeIdFromUrl ?? 0)
  const isRefereeValid = !!refereeQuery.data

  const referrerQuery = useEmployeeForFilter(referrerIdFromUrl ?? 0)
  const isReferrerValid = !!referrerQuery.data

  const validatedFilterParams = useMemo(() => {
    return {
      recruitmentSource: isSourceValid ? String(recruitmentSourceIdFromUrl) : undefined,
      recruitmentChannel: isChannelValid ? String(recruitmentChannelIdFromUrl) : undefined,
      referee: isRefereeValid ? String(refereeIdFromUrl) : undefined,
      referrer: isReferrerValid ? String(referrerIdFromUrl) : undefined,
    }
  }, [
    isSourceValid,
    recruitmentSourceIdFromUrl,
    isChannelValid,
    recruitmentChannelIdFromUrl,
    isRefereeValid,
    refereeIdFromUrl,
    isReferrerValid,
    referrerIdFromUrl,
  ])

  const isFilterValidationLoading = useMemo(() => {
    const isSourceLoading = !!recruitmentSourceIdFromUrl && sourceQuery.isLoading
    const isChannelLoading = !!recruitmentChannelIdFromUrl && channelQuery.isLoading
    const isRefereeLoading = !!refereeIdFromUrl && refereeQuery.isLoading
    const isReferrerLoading = !!referrerIdFromUrl && referrerQuery.isLoading
    return isSourceLoading || isChannelLoading || isRefereeLoading || isReferrerLoading
  }, [
    recruitmentSourceIdFromUrl,
    sourceQuery.isLoading,
    recruitmentChannelIdFromUrl,
    channelQuery.isLoading,
    refereeIdFromUrl,
    refereeQuery.isLoading,
    referrerIdFromUrl,
    referrerQuery.isLoading,
  ])

  const rawBranchId = parsePositiveInt(searchParams.get('branch'))

  const branchQuery = useBranchForFilter(rawBranchId ?? 0)
  const isBranchValid = !!branchQuery.data

  const validatedBranchId = isBranchValid ? rawBranchId : undefined

  const isBranchValidationLoading = useMemo(() => {
    if (rawBranchId && branchQuery.isLoading) return true
    return false
  }, [rawBranchId, branchQuery.isLoading])

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
  }, [debouncedSearch, isUrlReady])

  const isExpensesQueryReady =
    isUrlReady && !isFilterValidationLoading && !isBranchValidationLoading

  // Build API params from URL (with validated IDs)
  const apiParams = useMemo(() => {
    if (!isExpensesQueryReady) return undefined

    const baseParams = buildApiParamsFromUrl(searchParams)

    // Only add validated IDs to API params
    if (validatedFilterParams.recruitmentSource) {
      baseParams.recruitment_source = parseInt(validatedFilterParams.recruitmentSource, 10)
    }
    if (validatedFilterParams.recruitmentChannel) {
      baseParams.recruitment_channel = parseInt(validatedFilterParams.recruitmentChannel, 10)
    }
    if (validatedFilterParams.referee) {
      baseParams.referee = parseInt(validatedFilterParams.referee, 10)
    }
    if (validatedFilterParams.referrer) {
      baseParams.referrer = parseInt(validatedFilterParams.referrer, 10)
    }

    if (validatedBranchId) {
      baseParams.branch = validatedBranchId
    }

    return baseParams
  }, [searchParams, isExpensesQueryReady, validatedFilterParams, validatedBranchId])

  // Call API with params derived from URL
  const {
    data: expensesData,
    isLoading,
    error,
    isFetching,
    isRefetching,
  } = useRecruitmentExpenses(apiParams, {
    enabled: isExpensesQueryReady && !!apiParams,
  })

  // Parse current filter params from URL for dialog (merge validated IDs)
  const currentFilterParams = useMemo(() => {
    const parsed = parseFilterParamsFromUrl(searchParams)
    return {
      ...parsed,
      ...validatedFilterParams,
      branch: validatedBranchId,
    }
  }, [searchParams, validatedFilterParams, validatedBranchId])

  // Get pagination info from URL
  const currentPage = parsePositiveInt(searchParams.get('page')) ?? 1
  const pageSizeFromUrl = parsePositiveInt(searchParams.get('page_size'))
  const pageSize =
    pageSizeFromUrl && PAGE_SIZES.includes(pageSizeFromUrl) ? pageSizeFromUrl : PAGE_SIZE
  const currentOrdering = searchParams.get('ordering') || undefined

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
        newParams.delete('ordering')
      } else {
        const ordering = direction === 'desc' ? `-${field}` : field
        newParams.set('ordering', ordering)
      }
      // Reset to page 1 when sorting changes
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

    if (formData.recruitmentSource) {
      newParams.set('recruitment_source', String(formData.recruitmentSource))
    }

    if (formData.recruitmentChannel) {
      newParams.set('recruitment_channel', String(formData.recruitmentChannel))
    }

    if (formData.referee) {
      newParams.set('referee', String(formData.referee))
    }

    if (formData.referrer) {
      newParams.set('referrer', String(formData.referrer))
    }

    if (formData.branch) {
      newParams.set('branch', String(formData.branch))
    }

    if (formData.paymentStatuses?.length) {
      newParams.set('payment_statuses', formData.paymentStatuses.join(','))
    }

    if (formData.is_valid) {
      newParams.set('is_valid', formData.is_valid)
    }

    if (formData.invalid_referee_in_backoffice) {
      newParams.set('invalid_referee_in_backoffice', formData.invalid_referee_in_backoffice)
    }

    if (formData.invalid_referrer_left_by_expense_date) {
      newParams.set(
        'invalid_referrer_left_by_expense_date',
        formData.invalid_referrer_left_by_expense_date
      )
    }

    if (formData.invalid_referrer_was_leadership) {
      newParams.set('invalid_referrer_was_leadership', formData.invalid_referrer_was_leadership)
    }

    if (
      formData.invalid_referee_min_working_days &&
      formData.invalid_referee_min_working_days > 0
    ) {
      newParams.set(
        'invalid_referee_min_working_days',
        String(formData.invalid_referee_min_working_days)
      )
    }

    setSearchParams(newParams, { replace: true })
    setIsFilterDialogOpen(false)
  }, [searchParams, setSearchParams, pageSize])

  // Handle clear all (search + filters) - reset to defaults (no filters)
  const handleClearAll = useCallback(() => {
    setSearchInput('')
    const newParams = new URLSearchParams()
    newParams.set('page', '1')
    newParams.set('page_size', String(PAGE_SIZE))
    setSearchParams(newParams, { replace: true })
  }, [setSearchParams])

  const handleCreateNew = useCallback(() => {
    navigate(APP_PATH.RECRUITMENT_EXPENSE_CREATE, {
      state: { from: window.location.pathname + window.location.search },
    })
  }, [navigate])

  const handleDeleteRecruitmentExpense = useCallback(
    (expense: RecruitmentExpense) => {
      openDeleteDialog(expense)
    },
    [openDeleteDialog]
  )

  const handleExport = useCallback(() => {
    openExportDialog(searchInput, currentFilterParams)
  }, [openExportDialog, searchInput, currentFilterParams])

  const handleImport = useCallback(() => {
    openImportDialog()
  }, [openImportDialog])

  // Calculate active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (currentFilterParams.dateRange?.from || currentFilterParams.dateRange?.to) count++
    if (currentFilterParams.recruitmentSource) count++
    if (currentFilterParams.recruitmentChannel) count++
    if (currentFilterParams.referee) count++
    if (currentFilterParams.referrer) count++
    if (currentFilterParams.branch) count++
    if (currentFilterParams.paymentStatuses?.length) count++
    if (currentFilterParams.is_valid) count++
    if (currentFilterParams.invalid_referee_in_backoffice) count++
    if (currentFilterParams.invalid_referrer_left_by_expense_date) count++
    if (currentFilterParams.invalid_referrer_was_leadership) count++
    // Chỉ count min_working_days khi khác mặc định (30) để default không hiện badge
    if (
      currentFilterParams.invalid_referee_min_working_days &&
      currentFilterParams.invalid_referee_min_working_days !==
        DEFAULT_INVALID_REFEREE_MIN_WORKING_DAYS
    ) {
      count++
    }
    return count
  }, [currentFilterParams])

  // Transform data for table
  const { tableData, pageCount, totalRecords } = useMemo(() => {
    const results = expensesData?.results ?? []
    const count = expensesData?.count ?? 0

    return {
      tableData: results,
      pageCount: Math.ceil(count / pageSize) || 1,
      totalRecords: count,
    }
  }, [expensesData, pageSize])

  const handleSelectionChange = useCallback(
    (newPageSelection: RecruitmentExpense[]) => {
      const currentPageIds = new Set(tableData.map((r) => r.id))
      setSelectedRows((prev) => {
        const fromOtherPages = prev.filter((r) => !currentPageIds.has(r.id))
        return [...fromOtherPages, ...newPageSelection]
      })
    },
    [tableData]
  )

  const isTableLoading = isLoading || isFetching || isRefetching

  // Convert currentFilterParams to form initialValues format
  const formInitialValues = useMemo(() => {
    return {
      dateRange: currentFilterParams.dateRange || undefined,
      recruitmentSource: currentFilterParams.recruitmentSource || undefined,
      recruitmentChannel: currentFilterParams.recruitmentChannel || undefined,
      referee: currentFilterParams.referee || undefined,
      referrer: currentFilterParams.referrer || undefined,
      branch: currentFilterParams.branch || undefined,
      paymentStatuses: currentFilterParams.paymentStatuses || undefined,
      is_valid: currentFilterParams.is_valid || undefined,
      invalid_referee_in_backoffice: currentFilterParams.invalid_referee_in_backoffice || undefined,
      invalid_referrer_left_by_expense_date:
        currentFilterParams.invalid_referrer_left_by_expense_date || undefined,
      invalid_referrer_was_leadership:
        currentFilterParams.invalid_referrer_was_leadership || undefined,
      invalid_referee_min_working_days:
        currentFilterParams.invalid_referee_min_working_days ??
        DEFAULT_INVALID_REFEREE_MIN_WORKING_DAYS,
    }
  }, [currentFilterParams])

  return (
    <>
      <PageTitle
        searchPlaceholder="Tìm kiếm theo nguồn, kênh tuyển dụng"
        searchClassName="!w-[350px]"
        handleSearch={setSearchInput}
        searchValue={searchInput}
        handleFilter={handleOpenFilterDialog}
        filterBadgeCount={activeFilterCount}
        handleCreateNew={ability.can('create', 'recruitment_expense') ? handleCreateNew : undefined}
        handleExportBtnFull={handleExport}
        handleImportBtnFull={
          ability.can('import_template', 'recruitment_expense') ? handleImport : undefined
        }
        customActions={
          isBulkMode ? (
            <div className="flex items-center gap-3">
              <span className="typo-body-sm text-content-dark-2">
                Đã chọn: {selectedRows.length}
              </span>
              <Button variant="secondary-border" onClick={handleExitBulkMode}>
                Huỷ
              </Button>
              <Button
                leftIcon={<IconCheckcircle />}
                onClick={handleOpenResetDialog}
                disabled={selectedRows.length === 0}
              >
                Reset chi phí
              </Button>
            </div>
          ) : (
            <Button
              variant="secondary-border"
              leftIcon={<IconCheckcircle />}
              onClick={handleEnterBulkMode}
            >
              Reset chi phí
            </Button>
          )
        }
      />

      <Flex flexGrow={'1'} direction="column" gap="0" className="pb-6">
        <div className="flex-1 overflow-x-auto overflow-y-auto border-solid pt-0 pb-10">
          <RecruitmentExpenseTable
            key={isBulkMode ? 'expense-table-bulk' : 'expense-table-single'}
            data={tableData}
            isLoading={isTableLoading}
            error={error}
            pageCount={pageCount}
            pageSize={pageSize}
            currentPage={currentPage}
            totalRecords={totalRecords}
            ordering={currentOrdering}
            onPaginationChange={handlePaginationChange}
            onSortingChange={handleSortingChange}
            onDeleteRecruitmentExpense={handleDeleteRecruitmentExpense}
            onClearFilter={handleClearAll}
            hasFilter={!!searchInput || activeFilterCount > 0}
            selectedRows={isBulkMode ? selectedRows : []}
            onSelectionChange={isBulkMode ? handleSelectionChange : undefined}
            enableRowSelection={isBulkMode}
          />
        </div>
      </Flex>

      {/* Filter Dialog using AppDialog with variant='filter' */}
      <AppDialog
        variant="filter"
        open={isFilterDialogOpen}
        onOpenChange={setIsFilterDialogOpen}
        content={
          <RecruitmentExpenseFilterForm
            ref={formRef}
            initialValues={formInitialValues}
            onApply={handleApplyFilter}
            onClear={handleClearFilterInDialog}
          />
        }
        onClearFilter={handleClearFilterInDialog}
        onConfirm={handleApplyFilter}
        onCancel={handleCloseFilterDialog}
      />

      <BulkMarkInvalidDialog
        open={isResetDialogOpen}
        onOpenChange={setIsResetDialogOpen}
        selectedExpenses={selectedRows}
        onSuccess={handleResetSuccess}
      />
    </>
  )
}

export default RecruitmentExpensePage
