import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import ReportRecruitmentReferralTable from '@/features/report/recruitment/referral/view/ReportRecruitmentReferralTable'
import RecruitmentReferralFilterForm, {
  type RecruitmentReferralFilterFormRef,
} from '@/features/report/recruitment/referral/components/RecruitmentReferralFilterForm'
import { PageTitle } from '@/components/ui'
import HorizontalScrollBar from '@/components/ui/table/HorizontalScrollBar'
import { useSidebar } from '@/components/ui/sidebar/sidebar.tsx'
import AppDialog from '@/components/dialog/AppDialog'
import { Box } from '@radix-ui/themes'
import { format } from 'date-fns'
import {
  type GetReferralCostReportParams,
  useReferralCostReport,
  useExportReferralCostReport,
} from '@/features/report/services/hrm-report-service'
import {
  parseReportPaymentStatus,
  REPORT_PAYMENT_STATUS_LABEL,
  ReportPaymentStatus,
} from '@/features/report/recruitment/_shares/constants/report-payment-status'
import { useBranchForFilter } from '@/hooks/useFilterEntityValidation'
import { parsePositiveInt } from '@/utils/common'
import { cn } from '@/utils'

export interface OrgFilter {
  branch?: { id: number; name: string }
  block?: { id: number; name: string }
  department?: { id: number; name: string }
}

/**
 * Validate month string format (MM/yyyy)
 */
function isValidMonthString(monthStr: string): boolean {
  if (!monthStr) return false
  // Check format MM/yyyy
  const monthPattern = /^\d{2}\/\d{4}$/
  if (!monthPattern.test(monthStr)) return false
  // Parse and validate
  const [month, year] = monthStr.split('/').map(Number)
  if (month < 1 || month > 12) return false
  if (year < 1900 || year > 2100) return false
  // Try to create date to ensure it's valid
  const parsed = new Date(year, month - 1, 1)
  return (
    !isNaN(parsed.getTime()) && parsed.getFullYear() === year && parsed.getMonth() + 1 === month
  )
}

/**
 * Parse filter params from URL for form display
 */
function parseFilterParamsFromUrl(searchParams: URLSearchParams) {
  const params: {
    month?: Date
    branchId?: number
    paymentStatus?: ReportPaymentStatus
  } = {}

  // Month (MM/yyyy format) - only parse if valid format
  const monthStr = searchParams.get('month')
  if (monthStr) {
    // Validate format MM/yyyy before parsing
    const monthPattern = /^\d{2}\/\d{4}$/
    if (monthPattern.test(monthStr)) {
      const [month, year] = monthStr.split('/').map(Number)
      if (month >= 1 && month <= 12 && year >= 1900 && year <= 2100) {
        const parsed = new Date(year, month - 1, 1)
        if (
          !isNaN(parsed.getTime()) &&
          parsed.getFullYear() === year &&
          parsed.getMonth() + 1 === month
        ) {
          params.month = parsed
        }
      }
    }
  }

  // Cascade IDs
  params.branchId = parsePositiveInt(searchParams.get('branch')) ?? undefined

  // Payment status
  params.paymentStatus = parseReportPaymentStatus(searchParams.get('payment_status'))

  return params
}

/**
 * Build API params from URL
 */
function buildApiParamsFromUrl(
  searchParams: URLSearchParams,
  validatedBranchId?: number
): GetReferralCostReportParams {
  const params: NonNullable<GetReferralCostReportParams> = {}

  // Month - only include if valid format
  const month = searchParams.get('month')
  if (month && isValidMonthString(month)) {
    params.month = month
  }

  // Cascade IDs (validated)
  if (validatedBranchId) params.branch = validatedBranchId

  // Payment status
  const paymentStatus = parseReportPaymentStatus(searchParams.get('payment_status'))
  if (paymentStatus) params.payment_status = paymentStatus

  return params
}

const ReportRecruitmentReferralCostPage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [isFilterValid, setIsFilterValid] = useState(true)
  const { state: sidebarState } = useSidebar()
  const filterFormRef = useRef<RecruitmentReferralFilterFormRef>(null)
  const pageScrollRef = useRef<HTMLDivElement | null>(null)
  const tableHorizontalScrollRef = useRef<HTMLDivElement | null>(null)
  const tableWrapperRef = useRef<HTMLDivElement | null>(null)

  // Track if URL has been initialized
  const [isUrlReady, setIsUrlReady] = useState(false)

  // Parse URL params
  const urlParams = useMemo(() => parseFilterParamsFromUrl(searchParams), [searchParams])

  // Initialize URL with defaults if empty (only on direct access, not navigate back)
  useEffect(() => {
    // Check actual browser URL to avoid race condition with searchParams
    const actualUrlSearch = window.location.search
    const actualUrlParams = new URLSearchParams(actualUrlSearch)
    const isUrlEmpty = actualUrlParams.toString() === '' && searchParams.toString() === ''

    // Check required params
    const hasMonth = searchParams.has('month') || actualUrlParams.has('month')
    const hasPaymentStatus =
      searchParams.has('payment_status') || actualUrlParams.has('payment_status')

    // Set defaults for required params if missing
    if (!hasMonth || !hasPaymentStatus) {
      const newParams = isUrlEmpty ? new URLSearchParams() : new URLSearchParams(searchParams)
      if (!hasMonth) {
        newParams.set('month', format(new Date(), 'MM/yyyy'))
      }
      if (!hasPaymentStatus) {
        newParams.set('payment_status', ReportPaymentStatus.PAID)
      }
      setSearchParams(newParams, { replace: true })
    }
    setIsUrlReady(true)
  }, []) // Only run once on mount

  // === CASCADE VALIDATION ===
  const rawBranchId = urlParams.branchId
  const branchQuery = useBranchForFilter(rawBranchId ?? 0)
  const isBranchValid = !!branchQuery.data

  const validatedBranchId = isBranchValid ? rawBranchId : undefined

  const isFilterValidationLoading = useMemo(() => {
    if (rawBranchId && branchQuery.isLoading) return true
    return false
  }, [rawBranchId, branchQuery.isLoading])

  // Check if month is valid (required for this report)
  const hasValidMonth = !!urlParams.month

  // Build API params
  const apiParams = useMemo(() => {
    if (!isUrlReady || isFilterValidationLoading || !hasValidMonth) return undefined
    return buildApiParamsFromUrl(searchParams, validatedBranchId)
  }, [searchParams, isUrlReady, isFilterValidationLoading, hasValidMonth, validatedBranchId])

  // API call
  const { data, isLoading } = useReferralCostReport(apiParams, {
    enabled: isUrlReady && !isFilterValidationLoading && hasValidMonth && !!apiParams,
  })

  // Handle apply filter
  const handleApplyFilter = useCallback(() => {
    const formData = filterFormRef.current?.getValues()
    if (!formData) return

    // Validate month
    if (!formData.month) {
      return
    }

    const newParams = new URLSearchParams()

    // Month (convert Date to MM/yyyy format)
    const monthStr = format(formData.month, 'MM/yyyy')
    newParams.set('month', monthStr)

    // Organization filter
    if (formData.branch) {
      newParams.set('branch', String(formData.branch))
    }

    // Payment status
    if (formData.paymentStatus) {
      newParams.set('payment_status', formData.paymentStatus)
    }

    setSearchParams(newParams, { replace: true })
    setIsFilterOpen(false)
  }, [setSearchParams])

  // Handle clear filter
  const handleClearFilter = useCallback(() => {
    filterFormRef.current?.clearForm()
  }, [])

  // Handle validation change from form
  const handleFilterValidationChange = useCallback((isValid: boolean) => {
    setIsFilterValid(isValid)
  }, [])

  // Filter count - only count valid filters that are actually used in API
  const activeFilterCount = useMemo(() => {
    let count = 0
    // Only count month if it's valid and parsed
    if (urlParams.month) count++
    if (validatedBranchId) count++
    if (urlParams.paymentStatus) count++
    return count
  }, [urlParams.month, validatedBranchId, urlParams.paymentStatus])

  // Current month display
  const currentMonth = useMemo(() => {
    return urlParams.month ? format(urlParams.month, 'MM/yyyy') : format(new Date(), 'MM/yyyy')
  }, [urlParams.month])

  // Current payment status display
  const currentPaymentStatusLabel = useMemo(
    () => (urlParams.paymentStatus ? REPORT_PAYMENT_STATUS_LABEL[urlParams.paymentStatus] : ''),
    [urlParams.paymentStatus]
  )

  // Handle export
  // BE export — styled XLSX generated server-side per CR (commit 3866d32f wired the endpoint).
  const { openExportDialog: openExportReferralDialog } = useExportReferralCostReport()

  const handleExport = useCallback(() => {
    if (!apiParams) return
    openExportReferralDialog({
      month: apiParams.month,
      branch: apiParams.branch,
      payment_status: apiParams.payment_status,
    })
  }, [apiParams, openExportReferralDialog])

  // Form initial values
  const formInitialValues = useMemo(
    () => ({
      month: urlParams.month,
      branch: validatedBranchId,
      paymentStatus: urlParams.paymentStatus,
    }),
    [urlParams.month, validatedBranchId, urlParams.paymentStatus]
  )

  useLayoutEffect(() => {
    const tableRoot = tableWrapperRef.current
    if (!tableRoot) return

    const table = tableRoot.querySelector('table') as HTMLElement | null
    if (!table) return

    const thead = table.querySelector('thead') as HTMLElement | null
    if (!thead) return

    const navBar = document.querySelector('[data-name="Header"]') as HTMLElement | null
    if (!navBar) return

    const scrollContainer = pageScrollRef.current
    if (!scrollContainer) return

    let frameId: number | null = null
    let lastTranslateOffset = -1

    const applyStickyTop = () => {
      frameId = null
      const navBarBottom = Math.round(navBar.getBoundingClientRect().bottom)
      const scrollContainerTop = Math.round(scrollContainer.getBoundingClientRect().top)
      const nextTranslateOffset =
        scrollContainerTop < navBarBottom ? Math.max(0, navBarBottom - scrollContainerTop) : 0

      if (nextTranslateOffset === lastTranslateOffset) return

      lastTranslateOffset = nextTranslateOffset
      thead.style.transform =
        nextTranslateOffset > 0 ? `translateY(${nextTranslateOffset}px)` : 'translateY(0px)'
    }

    const requestStickyTopUpdate = () => {
      if (frameId !== null) return
      frameId = window.requestAnimationFrame(applyStickyTop)
    }

    requestStickyTopUpdate()
    thead.style.willChange = 'transform'
    window.addEventListener('resize', requestStickyTopUpdate)
    window.addEventListener('scroll', requestStickyTopUpdate, { passive: true })
    scrollContainer.addEventListener('scroll', requestStickyTopUpdate, { passive: true })

    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId)
      }
      window.removeEventListener('resize', requestStickyTopUpdate)
      window.removeEventListener('scroll', requestStickyTopUpdate)
      scrollContainer.removeEventListener('scroll', requestStickyTopUpdate)
      thead.style.transform = 'translateY(0px)'
      thead.style.willChange = ''
    }
  }, [data, isLoading, isFilterValidationLoading])

  return (
    <>
      <PageTitle
        handleFilter={() => setIsFilterOpen(true)}
        filterBadgeCount={activeFilterCount}
        handleExportBtnFull={handleExport}
      />

      <Box pb={'6'}>
        <div className="flex gap-6 px-10 pb-4">
          <div>
            <span className="typo-body-lg-medium text-content-dark-2">Tháng:</span>
            <span className="typo-body-lg-semibold text-content-dark-1"> {currentMonth}</span>
          </div>
          {currentPaymentStatusLabel && (
            <div>
              <span className="typo-body-lg-medium text-content-dark-2">
                Trạng thái thanh toán:
              </span>
              <span className="typo-body-lg-semibold text-content-dark-1">
                {' '}
                {currentPaymentStatusLabel}
              </span>
            </div>
          )}
        </div>
        <div
          ref={pageScrollRef}
          className="min-w-0 flex-1 overflow-x-auto overflow-y-auto border-solid pt-0 pb-10"
        >
          <div ref={tableWrapperRef} className="min-w-0">
            <ReportRecruitmentReferralTable
              data={data}
              isLoading={isLoading || isFilterValidationLoading}
              scrollContainerRef={tableHorizontalScrollRef}
            />
          </div>
        </div>
        <div
          className={cn(
            'bg-content-light-1 fixed bottom-0 z-20 flex flex-col py-2',
            sidebarState === 'expanded'
              ? 'left-[var(--sidebar-width)] w-[calc(100%-var(--sidebar-width))]'
              : 'left-[var(--sidebar-width-icon)] w-[calc(100%-var(--sidebar-width-icon))]'
          )}
        >
          <div className="pr-10 pl-10">
            <HorizontalScrollBar
              containerRef={tableHorizontalScrollRef}
              className="border-border-1 border-x-0 border-b-0"
            />
          </div>
        </div>
      </Box>

      <AppDialog
        variant="filter"
        open={isFilterOpen}
        onOpenChange={setIsFilterOpen}
        title="Bộ lọc"
        content={
          <RecruitmentReferralFilterForm
            ref={filterFormRef}
            initialValues={formInitialValues}
            onValidationChange={handleFilterValidationChange}
            showBlock={false}
            showDepartment={false}
          />
        }
        onConfirm={handleApplyFilter}
        onCancel={() => setIsFilterOpen(false)}
        onClearFilter={handleClearFilter}
        disableConfirm={!isFilterValid}
      />
    </>
  )
}

export default ReportRecruitmentReferralCostPage
