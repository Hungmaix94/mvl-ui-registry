import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Box, Flex, Text } from '@radix-ui/themes'
import { format } from 'date-fns'
import { PageTitle } from '@/components/ui'
import AttendanceMethodTable from '@/features/report/attendance/method/view/AttendanceMethodTable'
import AttendanceMethodFilterForm, {
  type AttendanceMethodFilterFormRef,
} from '@/features/report/attendance/method/components/AttendanceMethodFilterForm'
import { DATE_FORMAT } from '@/constants/date-format'
import type { GetAttendanceByMethodReportParams } from '@/features/report/services/attendance-report-service'
import {
  useExportAttendanceReportByMethod,
  useExportAttendanceByMethodEmployeeRate,
} from '@/features/report/services/attendance-report-service'
import { Button } from '@/components/ui'
import {
  useBranchForFilter,
  useBlockForFilter,
  useDepartmentForFilter,
} from '@/hooks/useFilterEntityValidation'
import { parsePositiveInt } from '@/utils/common'
import AppDialog from '@/components/dialog/AppDialog'
import { formatDateToApi } from '@/utils/date-utils'
import { useDialog } from '@/hooks/useDialog'
import EmployeeRateExportDialog, {
  type EmployeeRateExportDialogRef,
} from '@/features/report/_shares/components/EmployeeRateExportDialog'
import HorizontalScrollBar from '@/components/ui/table/HorizontalScrollBar'
import { useSidebar } from '@/components/ui/sidebar/sidebar.tsx'
import { cn } from '@/utils'
import { ExportDelivery } from '@/constants/api-schema-aliases'

/**
 * Validate date string format (YYYY-MM-DD)
 */
function isValidDateString(dateStr: string): boolean {
  if (!dateStr) return false
  // Check format YYYY-MM-DD
  const datePattern = /^\d{4}-\d{2}-\d{2}$/
  if (!datePattern.test(dateStr)) return false
  // Parse and validate
  const parsed = new Date(dateStr)
  if (isNaN(parsed.getTime())) return false
  // Ensure the parsed date matches the input string (prevents invalid dates like 2025-12-32)
  const [year, month, day] = dateStr.split('-').map(Number)
  return (
    parsed.getFullYear() === year && parsed.getMonth() + 1 === month && parsed.getDate() === day
  )
}

/**
 * Parse filter params from URL for form display
 */
function parseFilterParamsFromUrl(searchParams: URLSearchParams) {
  const params: {
    fromDate?: Date
    toDate?: Date
    branchId?: number
    blockId?: number
    departmentId?: number
  } = {}

  // Date range - only parse valid YYYY-MM-DD strings
  const fromDate = searchParams.get('from_date')
  if (fromDate && isValidDateString(fromDate)) {
    params.fromDate = new Date(fromDate)
  }
  const toDate = searchParams.get('to_date')
  if (toDate && isValidDateString(toDate)) {
    params.toDate = new Date(toDate)
  }

  // Cascade IDs
  params.branchId = parsePositiveInt(searchParams.get('branch')) ?? undefined
  params.blockId = parsePositiveInt(searchParams.get('block')) ?? undefined
  params.departmentId = parsePositiveInt(searchParams.get('department')) ?? undefined

  return params
}

/**
 * Build API params from URL. Both from_date and to_date are required.
 */
function buildApiParamsFromUrl(
  searchParams: URLSearchParams,
  validatedBranchId?: number,
  validatedBlockId?: number,
  validatedDepartmentId?: number
): GetAttendanceByMethodReportParams | undefined {
  const fromDate = searchParams.get('from_date')
  const toDate = searchParams.get('to_date')
  if (!fromDate || !toDate || !isValidDateString(fromDate) || !isValidDateString(toDate)) {
    return undefined
  }

  const params: GetAttendanceByMethodReportParams = {
    from_date: fromDate,
    to_date: toDate,
  }

  // Cascade IDs (validated)
  if (validatedBranchId) params.branch = validatedBranchId
  if (validatedBlockId) params.block = validatedBlockId
  if (validatedDepartmentId) params.department = validatedDepartmentId

  return params
}

const ReportAttendanceMethodPage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const filterFormRef = useRef<AttendanceMethodFilterFormRef>(null)
  const { state: sidebarState } = useSidebar()
  const pageScrollRef = useRef<HTMLDivElement | null>(null)
  const tableHorizontalScrollRef = useRef<HTMLDivElement | null>(null)
  const tableWrapperRef = useRef<HTMLDivElement | null>(null)

  // Track if URL has been initialized
  const [isUrlReady, setIsUrlReady] = useState(false)

  const [isFormValid, setIsFormValid] = useState(false)

  // Parse URL params
  const urlParams = useMemo(() => parseFilterParamsFromUrl(searchParams), [searchParams])

  // Initialize URL with defaults if missing. Both from_date and to_date are
  // required — default to today (from_date = to_date = today) so the report
  // reflects the current day's attendance, not a weekly average that drifts
  // from the daily not-checked-in list.
  // Soft backward-compat: if legacy ?attendance_date=X is present without a
  // range, map it to from_date=X&to_date=X so old bookmarks still show data.
  useEffect(() => {
    const actualUrlSearch = window.location.search
    const actualUrlParams = new URLSearchParams(actualUrlSearch)
    const isUrlEmpty = actualUrlParams.toString() === '' && searchParams.toString() === ''

    const hasFrom = searchParams.has('from_date') || actualUrlParams.has('from_date')
    const hasTo = searchParams.has('to_date') || actualUrlParams.has('to_date')

    if (!hasFrom || !hasTo) {
      const newParams = isUrlEmpty ? new URLSearchParams() : new URLSearchParams(searchParams)

      // Legacy migration: single attendance_date → from=to=that date
      const legacyDate =
        searchParams.get('attendance_date') ?? actualUrlParams.get('attendance_date')
      if (legacyDate && isValidDateString(legacyDate)) {
        newParams.set('from_date', legacyDate)
        newParams.set('to_date', legacyDate)
        newParams.delete('attendance_date')
      } else {
        const todayStr = formatDateToApi(new Date())
        if (todayStr) {
          newParams.set('from_date', todayStr)
          newParams.set('to_date', todayStr)
        }
      }
      setSearchParams(newParams, { replace: true })
    }
    setIsUrlReady(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run once on mount

  // Track URL changes after initialization
  useEffect(() => {
    if (isUrlReady) {
      // URL changed after init
    }
  }, [searchParams, isUrlReady])

  // === CASCADE VALIDATION ===
  const rawBranchId = urlParams.branchId
  const rawBlockId = urlParams.blockId
  const rawDepartmentId = urlParams.departmentId

  // Branch validation
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

  // Both from_date and to_date are required for this report
  const hasValidDateRange = !!(urlParams.fromDate && urlParams.toDate)

  // Build API params
  const apiParams = useMemo(() => {
    if (!isUrlReady || isFilterValidationLoading || !hasValidDateRange) return undefined
    return buildApiParamsFromUrl(
      searchParams,
      validatedBranchId,
      validatedBlockId,
      validatedDepartmentId
    )
  }, [
    searchParams,
    isUrlReady,
    isFilterValidationLoading,
    hasValidDateRange,
    validatedBranchId,
    validatedBlockId,
    validatedDepartmentId,
  ])

  const { openExportDialog: openExportAttendanceByMethodDialog } =
    useExportAttendanceReportByMethod()
  const { openExportDialog: openExportEmployeeRateDialog } =
    useExportAttendanceByMethodEmployeeRate()

  // Handle apply filter
  const handleApplyFilter = useCallback(() => {
    const formData = filterFormRef.current?.getValues()
    if (!formData?.dateRange?.from || !formData?.dateRange?.to) return

    const fromStr = formatDateToApi(formData.dateRange.from)
    const toStr = formatDateToApi(formData.dateRange.to)
    if (!fromStr || !toStr) return

    const newParams = new URLSearchParams()
    newParams.set('from_date', fromStr)
    newParams.set('to_date', toStr)

    // Cascade IDs
    if (formData.branch) {
      newParams.set('branch', formData.branch)
    }
    if (formData.block) {
      newParams.set('block', formData.block)
    }
    if (formData.department) {
      newParams.set('department', formData.department)
    }

    setSearchParams(newParams, { replace: true })
    setIsFilterOpen(false)
  }, [setSearchParams])

  // Handle clear filter
  const handleClearFilter = useCallback(() => {
    filterFormRef.current?.clearForm()
    // Reset validation state when clearing
    setIsFormValid(false)
  }, [])

  // Filter count - only count valid filters that are actually used in API.
  // The date range is one logical filter regardless of from/to span.
  const filterBadgeCount = useMemo(() => {
    let count = 0
    if (urlParams.fromDate && urlParams.toDate) count++
    if (validatedBranchId) count++
    if (validatedBlockId) count++
    if (validatedDepartmentId) count++
    return count
  }, [
    urlParams.fromDate,
    urlParams.toDate,
    validatedBranchId,
    validatedBlockId,
    validatedDepartmentId,
  ])

  // Subtitle: collapse identical from/to to single date for readability
  const filterDateText = useMemo(() => {
    if (!urlParams.fromDate || !urlParams.toDate) return '-'
    const fromStr = format(urlParams.fromDate, DATE_FORMAT)
    const toStr = format(urlParams.toDate, DATE_FORMAT)
    return fromStr === toStr ? fromStr : `${fromStr} - ${toStr}`
  }, [urlParams.fromDate, urlParams.toDate])

  const filterOrgText = useMemo(() => {
    const parts: string[] = []
    if (validatedBranchId && branchQuery.data?.name) {
      parts.push(`Chi nhánh ${branchQuery.data.name}`)
    }
    if (validatedBlockId && blockQuery.data?.name) {
      parts.push(`Khối ${blockQuery.data.name}`)
    }
    if (validatedDepartmentId && departmentQuery.data?.name) {
      parts.push(`Phòng ban ${departmentQuery.data.name}`)
    }
    return parts.length ? parts.join(' - ') : 'Toàn công ty'
  }, [
    validatedBranchId,
    validatedBlockId,
    validatedDepartmentId,
    branchQuery.data?.name,
    blockQuery.data?.name,
    departmentQuery.data?.name,
  ])

  const reportTitle = useMemo(
    () => `Báo cáo Thống kê chấm công theo phương thức - ${filterOrgText}`,
    [filterOrgText]
  )

  const handleExport = useCallback(() => {
    if (!apiParams) return
    openExportAttendanceByMethodDialog({
      ...apiParams,
      delivery: ExportDelivery.link,
    })
  }, [apiParams, openExportAttendanceByMethodDialog])

  // CR214 — per-employee attendance rate export.
  // BE chấp nhận `from_month` / `to_month` (MM/yyyy) + org scope — month-range
  // granularity, distinct from by-method report's day-range filter. Mở dialog
  // cho user chọn month range rồi mới gọi export, branch / block / department
  // lấy từ filter URL hiện tại.
  const { displayCustom, displayClose } = useDialog()
  const exportDialogRef = useRef<EmployeeRateExportDialogRef>(null)

  const handleExportEmployeeRate = useCallback(() => {
    displayCustom({
      title: 'Xuất tỷ lệ chấm công NV/tháng',
      size: 'md',
      destroyOnClose: true,
      content: <EmployeeRateExportDialog ref={exportDialogRef} />,
      confirmText: 'Xuất',
      cancelText: 'Hủy',
      onConfirm: async () => {
        const payload = await exportDialogRef.current?.getPayload()
        if (!payload) return // form invalid — keep dialog open
        displayClose()
        openExportEmployeeRateDialog({
          from_month: payload.from_month,
          to_month: payload.to_month,
          branch: validatedBranchId || undefined,
          block: validatedBlockId || undefined,
          department: validatedDepartmentId || undefined,
          async: true,
          delivery: ExportDelivery.link,
        })
      },
      onCancel: displayClose,
    })
  }, [
    displayCustom,
    displayClose,
    openExportEmployeeRateDialog,
    validatedBranchId,
    validatedBlockId,
    validatedDepartmentId,
  ])

  // Form initial values
  const formInitialValues = useMemo(
    () => ({
      dateRange:
        urlParams.fromDate && urlParams.toDate
          ? { from: urlParams.fromDate, to: urlParams.toDate }
          : undefined,
      branch: validatedBranchId ? String(validatedBranchId) : undefined,
      block: validatedBlockId ? String(validatedBlockId) : undefined,
      department: validatedDepartmentId ? String(validatedDepartmentId) : undefined,
      branchName: branchQuery.data?.name,
      blockName: blockQuery.data?.name,
      departmentName: departmentQuery.data?.name,
    }),
    [
      urlParams.fromDate,
      urlParams.toDate,
      validatedBranchId,
      validatedBlockId,
      validatedDepartmentId,
      branchQuery.data?.name,
      blockQuery.data?.name,
      departmentQuery.data?.name,
    ]
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
  }, [apiParams])

  return (
    <>
      <PageTitle
        title="Thống kê chấm công theo phương thức"
        handleFilter={() => setIsFilterOpen(true)}
        filterBadgeCount={filterBadgeCount}
        handleExportBtnFull={handleExport}
        customActions={
          <Button variant="secondary" onClick={handleExportEmployeeRate}>
            Xuất tỷ lệ chấm công NV/tháng
          </Button>
        }
      />

      <Box pb="6">
        <Box className="px-10 pb-4">
          <Flex direction="column" gap="1">
            <Text className="typo-body-xl-semibold text-content-dark-1">{reportTitle}</Text>
            <Text className="typo-body-base-medium text-content-dark-3">{filterDateText}</Text>
          </Flex>
        </Box>
        {apiParams && (
          <>
            <div
              ref={pageScrollRef}
              className="min-w-0 flex-1 overflow-x-auto overflow-y-auto border-solid pt-0 pb-10"
            >
              <div ref={tableWrapperRef} className="min-w-0">
                <AttendanceMethodTable
                  filters={apiParams}
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
          </>
        )}
      </Box>

      <AppDialog
        variant="filter"
        open={isFilterOpen}
        onOpenChange={(open) => {
          setIsFilterOpen(open)
          // Reset validation state when dialog opens
          if (open) {
            // When dialog opens, check initial values
            setIsFormValid(!!(formInitialValues.dateRange?.from && formInitialValues.dateRange?.to))
          }
        }}
        title="Bộ lọc"
        content={
          <AttendanceMethodFilterForm
            ref={filterFormRef}
            initialValues={formInitialValues}
            onValidationChange={setIsFormValid}
          />
        }
        onConfirm={handleApplyFilter}
        onCancel={() => setIsFilterOpen(false)}
        onClearFilter={handleClearFilter}
        disableConfirm={!isFormValid}
      />
    </>
  )
}

export default ReportAttendanceMethodPage
