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

export type UseRecruitmentDashboardFilterForMonthlyChartsOptions = {
  /** When false, branch field is hidden and branch params are never sent (default true). */
  includeBranch?: boolean
  /** When true, branch field allows selecting multiple branches. */
  allowMultipleBranch?: boolean
  /** API branch param key. Defaults to `branch`; use `branches` for staff-growth chart. */
  branchParamKey?: 'branch' | 'branches'
}

export const useRecruitmentDashboardFilterForMonthlyCharts = (
  options?: UseRecruitmentDashboardFilterForMonthlyChartsOptions
) => {
  const includeBranch = options?.includeBranch !== false
  const allowMultipleBranch = options?.allowMultipleBranch === true
  const branchParamKey = options?.branchParamKey ?? 'branch'
  const refForm = useRef<RecruitmentDashboardFilterFormRef>(null)
  // Default: từ đầu năm hiện tại đến hôm nay
  const defaultDateRange = useMemo(() => {
    const today = new Date()
    return {
      from: startOfYear(today),
      to: today,
    }
  }, [])

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
      (chartFilter.dateRange?.from ||
        chartFilter.dateRange?.to ||
        (includeBranch && chartFilter.branch != null))
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
    let branchValue: number | number[] | undefined
    if (
      includeBranch &&
      filterParams &&
      typeof filterParams === 'object' &&
      'branch' in filterParams &&
      filterParams.branch
    ) {
      branchValue = filterParams.branch
    }
    if (branchValue && (Array.isArray(branchValue) ? branchValue.length > 0 : true)) {
      count += 1
    }
    return count
  }, [filterParams, includeBranch])

  const apiParams = useMemo(() => {
    let branchParamValue: number | string | undefined
    let rawBranchValue: number | number[] | undefined
    if (
      includeBranch &&
      filterParams &&
      typeof filterParams === 'object' &&
      'branch' in filterParams &&
      filterParams.branch
    ) {
      rawBranchValue = filterParams.branch
    }

    if (rawBranchValue != null) {
      if (branchParamKey === 'branches') {
        const branchIds = (Array.isArray(rawBranchValue) ? rawBranchValue : [rawBranchValue])
          .map((value) => Number(value))
          .filter((value) => Number.isFinite(value))
        branchParamValue = branchIds.length ? branchIds.join(',') : undefined
      } else {
        const firstBranch = Array.isArray(rawBranchValue) ? rawBranchValue[0] : rawBranchValue
        branchParamValue = firstBranch != null ? Number(firstBranch) : undefined
      }
    }

    const withBranch = <T extends Record<string, string>>(
      q: T
    ): T | (T & Record<string, string | number>) =>
      branchParamValue != null ? { ...q, [branchParamKey]: branchParamValue } : q

    if (filterParams.dateRange?.from && filterParams.dateRange?.to) {
      return withBranch({
        from_date: formatDateToApi(filterParams.dateRange.from),
        to_date: formatDateToApi(filterParams.dateRange.to),
      })
    }
    if (filterParams.dateRange?.to) {
      return withBranch({
        to_date: formatDateToApi(filterParams.dateRange.to),
      })
    }
    if (filterParams.dateRange?.from) {
      return withBranch({
        from_date: formatDateToApi(filterParams.dateRange.from),
      })
    }
    if (branchParamValue != null) {
      return { [branchParamKey]: branchParamValue }
    }
    return {}
  }, [filterParams, chartFilterVersion, includeBranch, branchParamKey])

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
      const hasBranch =
        includeBranch &&
        !!filteredParams.branch &&
        (Array.isArray(filteredParams.branch) ? filteredParams.branch.length > 0 : true)
      // If no dateRange is set, clear chart filter and mark as explicitly cleared
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
            allowMultipleBranch={allowMultipleBranch}
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
    allowMultipleBranch,
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
