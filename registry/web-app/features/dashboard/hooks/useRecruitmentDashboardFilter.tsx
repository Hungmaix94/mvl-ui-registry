import { useCallback, useMemo, useRef, useState, useEffect } from 'react'
import { useDialog } from '@/hooks/useDialog.ts'
import RecruitmentDashboardFilterForm, {
  type RecruitmentDashboardFilterFormRef,
  type RecruitmentDashboardFilterFormValues,
} from '../components/recruitment/RecruitmentDashboardFilterForm.tsx'
import FilterFooter from '@/components/commons/FilterFooter'
import { cleanObject } from '@/utils/common.ts'
import { startOfYear } from 'date-fns'
import { formatDateRangeText, formatDateToApi } from '@/utils/date-utils.ts'
import { useDashboardFilterContext } from '../context/DashboardFilterContext'

export type UseRecruitmentDashboardFilterOptions = {
  /** When false, branch is hidden and never sent to API (e.g. cost breakdown by branch chart). Default true. */
  includeBranch?: boolean
  /** Overrides default range when no chart/dashboard filter applies (default: đầu năm → hôm nay). */
  defaultDateRange?: { from: Date; to: Date }
}

export const useRecruitmentDashboardFilter = (options?: UseRecruitmentDashboardFilterOptions) => {
  const includeBranch = options?.includeBranch !== false
  const refForm = useRef<RecruitmentDashboardFilterFormRef>(null)

  const defaultDateRange = useMemo(() => {
    if (options?.defaultDateRange) {
      return options.defaultDateRange
    }
    const today = new Date()
    return { from: startOfYear(today), to: today }
  }, [options?.defaultDateRange])

  // Get dashboard filter from context (if available)
  let dashboardFilterContext: ReturnType<typeof useDashboardFilterContext> | undefined
  try {
    dashboardFilterContext = useDashboardFilterContext()
  } catch {
    // Not in context, will use default
  }

  const [chartFilter, setChartFilter] = useState<RecruitmentDashboardFilterFormValues | null>(null)
  const [chartFilterVersion, setChartFilterVersion] = useState(0)
  const [isExplicitlyCleared, setIsExplicitlyCleared] = useState(false)
  const lastDashboardFilterVersion = useRef(0)

  // When dashboard filter changes (version increments), clear chart filter to use dashboard filter
  useEffect(() => {
    if (dashboardFilterContext?.dashboardFilterVersion !== undefined) {
      if (dashboardFilterContext.dashboardFilterVersion > lastDashboardFilterVersion.current) {
        setChartFilter(null) // Clear chart filter to use dashboard filter
        setIsExplicitlyCleared(false) // Reset explicitly cleared flag when dashboard filter changes
        lastDashboardFilterVersion.current = dashboardFilterContext.dashboardFilterVersion
      }
    }
  }, [dashboardFilterContext?.dashboardFilterVersion])

  // Priority: chartFilter > dashboardFilter (from context) > defaultDateRange (only if not explicitly cleared)
  const filterParams = useMemo(() => {
    let base: RecruitmentDashboardFilterFormValues | Record<string, never>
    if (
      chartFilter &&
      (chartFilter.dateRange?.from || chartFilter.dateRange?.to || chartFilter.branch != null)
    ) {
      base = chartFilter
    } else if (dashboardFilterContext?.dashboardFilter) {
      base = dashboardFilterContext.dashboardFilter
    } else if (isExplicitlyCleared) {
      base = {}
    } else {
      base = { dateRange: defaultDateRange }
    }
    if (!includeBranch && base && typeof base === 'object' && 'branch' in base) {
      const { branch: _omitBranch, ...rest } = base as RecruitmentDashboardFilterFormValues
      return rest
    }
    return base
  }, [
    chartFilter,
    dashboardFilterContext?.dashboardFilter,
    defaultDateRange,
    isExplicitlyCleared,
    includeBranch,
  ])

  const subTitle = useMemo(
    () =>
      filterParams
        ? formatDateRangeText(filterParams.dateRange?.from, filterParams.dateRange?.to)
        : '',
    [filterParams]
  )

  const filterCount = useMemo(() => {
    let count = 0
    if (filterParams?.dateRange?.from || filterParams?.dateRange?.to) {
      count += 1
    }
    if (includeBranch && filterParams && 'branch' in filterParams && filterParams.branch) {
      count += 1
    }
    return count
  }, [filterParams?.dateRange?.from, filterParams?.dateRange?.to, filterParams, includeBranch])

  const apiParams = useMemo(() => {
    if (filterParams.dateRange?.from && filterParams.dateRange?.to) {
      return {
        from_date: formatDateToApi(filterParams.dateRange.from),
        to_date: formatDateToApi(filterParams.dateRange.to),
      }
    }
    if (filterParams.dateRange?.to) {
      return {
        to_date: formatDateToApi(filterParams.dateRange.to),
      }
    }
    if (filterParams.dateRange?.from) {
      return {
        from_date: formatDateToApi(filterParams.dateRange.from),
      }
    }
    return {}
  }, [
    filterParams.dateRange?.from,
    filterParams.dateRange?.to,
    filterParams,
    includeBranch,
    chartFilterVersion,
  ])

  const { displayFormContent, displayClose } = useDialog()

  const onClickClearFilter = useCallback(() => {
    refForm.current?.clearForm()
    const newVersion = chartFilterVersion + 1
    setChartFilter(null) // Clear chart filter, will fallback to dashboard filter
    setIsExplicitlyCleared(true) // Mark as explicitly cleared
    setChartFilterVersion(newVersion) // Increment version to trigger refetch
    displayClose()
  }, [displayClose, chartFilterVersion])

  const onClickApply = useCallback(async () => {
    const formData = refForm.current?.getValues?.()
    if (formData) {
      const cleaned = cleanObject(formData) as RecruitmentDashboardFilterFormValues
      const filteredParams: RecruitmentDashboardFilterFormValues = includeBranch
        ? cleaned
        : (() => {
            const { branch: _b, ...rest } = cleaned
            return rest
          })()
      const newVersion = chartFilterVersion + 1
      // If no filter field is set, clear chart filter and mark as explicitly cleared
      const hasBranch = includeBranch && !!filteredParams.branch
      if (!filteredParams.dateRange?.from && !filteredParams.dateRange?.to && !hasBranch) {
        setChartFilter(null)
        setIsExplicitlyCleared(true) // Mark as explicitly cleared to avoid using defaultDateRange
        setChartFilterVersion(newVersion) // Increment version to trigger refetch
      } else {
        // Update chart filter (this will override dashboard filter for this chart)
        setChartFilter(filteredParams)
        setIsExplicitlyCleared(false) // Reset explicitly cleared flag when setting a filter
        setChartFilterVersion(newVersion) // Increment version to trigger refetch
      }
      displayClose()
    }
  }, [displayClose, chartFilterVersion, includeBranch])

  const openFilterModal = useCallback(() => {
    displayFormContent({
      title: 'Bộ lọc',
      content: (
        <>
          <RecruitmentDashboardFilterForm
            ref={refForm}
            initialValues={filterParams}
            onApply={onClickApply}
            onClear={onClickClearFilter}
            hideBranch={!includeBranch}
          />
        </>
      ),
      footer: (
        <FilterFooter onClear={onClickClearFilter} onApply={onClickApply} onCancel={displayClose} />
      ),
    })
  }, [
    displayFormContent,
    onClickApply,
    filterParams,
    onClickClearFilter,
    displayClose,
    includeBranch,
  ])

  return {
    openFilterModal,
    filterParams,
    setFilterParams: setChartFilter,
    subTitle,
    filterCount,
    apiParams,
  }
}
