import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  useAllAccountingPeriods,
  useCurrentAccountingPeriod,
} from '@/features/accounting/accounting-periods/services/accounting-period-service'
import { parsePositiveInt } from '@/utils/common'
import { formatDateToApi, getWeekRangeApi, parseDateFromApi } from '@/utils/date-utils'
import { buildTkkdReportParams, type TkkdPeriodType } from './tkkd-report-params'

export { buildTkkdReportParams }
export type { TkkdPeriodType }

/** Patch value: `null` removes the URL param, otherwise it is set. */
type ParamPatch = Record<string, string | number | null | undefined>

/** Optional filters as the filter dialog hands them back (dates as `Date`, ids as string). */
export type TkkdReportFilterSelection = {
  contractDateFrom?: Date
  contractDateTo?: Date
  /** Ngày làm phiếu TTGD — bộ lọc ĐỘC LẬP với contractDateFrom/To, cộng thêm (AND). */
  transactionSheetDateFrom?: Date
  transactionSheetDateTo?: Date
  branch?: string
  block?: string
  department?: string
}

/**
 * Shared filter state for the TKKD reports (task 86euvmaba), backed by the URL.
 *
 * Period: `month` (year+month via accounting period) or `week` (a Mon–Sun week
 * anchored by any date). Extra filters: deposit-contract sign-date range +
 * org-chart (branch/block/department). Returns the `TkkdRevenueGoodsParams` to
 * send to the API plus a `patch` helper to update the URL.
 */
export function useTkkdReportFilters() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [isUrlReady, setIsUrlReady] = useState(false)

  const { data: currentPeriod, isLoading: isLoadingCurrent } = useCurrentAccountingPeriod()
  const { data: allPeriods } = useAllAccountingPeriods()
  const periods = useMemo(() => allPeriods ?? [], [allPeriods])

  const periodType: TkkdPeriodType = searchParams.get('period_type') === 'week' ? 'week' : 'month'
  const year = parsePositiveInt(searchParams.get('year'))
  const month = parsePositiveInt(searchParams.get('month'))
  const week = searchParams.get('week') || undefined
  const contractDateFrom = searchParams.get('contract_date_from') || undefined
  const contractDateTo = searchParams.get('contract_date_to') || undefined
  const transactionSheetDateFrom = searchParams.get('transaction_sheet_date_from') || undefined
  const transactionSheetDateTo = searchParams.get('transaction_sheet_date_to') || undefined
  const branch = parsePositiveInt(searchParams.get('branch')) || undefined
  const block = parsePositiveInt(searchParams.get('block')) || undefined
  const department = parsePositiveInt(searchParams.get('department')) || undefined

  const activePeriodId = useMemo(() => {
    if (year && month) {
      return periods.find((p) => p.year === year && p.month === month)?.id || null
    }
    return null
  }, [periods, year, month])

  // Seed the missing period key so the report queries right away instead of sitting empty:
  // this week's Monday in week mode, the current accounting period in month mode.
  useEffect(() => {
    // Week mode needs no accounting period, so it is resolved before the periods guard.
    if (periodType === 'week') {
      if (!week) {
        const next = new URLSearchParams(searchParams)
        next.set('week', getWeekRangeApi(new Date()).from)
        setSearchParams(next, { replace: true })
        return
      }
      setIsUrlReady(true)
      return
    }
    if (periods.length === 0 || isLoadingCurrent) return
    if (year && month) {
      setIsUrlReady(true)
      return
    }
    const defaultPeriod = currentPeriod ?? periods[0]
    if (defaultPeriod) {
      const next = new URLSearchParams(searchParams)
      next.set('year', String(defaultPeriod.year))
      next.set('month', String(defaultPeriod.month))
      setSearchParams(next, { replace: true })
    }
  }, [
    periods,
    currentPeriod,
    isLoadingCurrent,
    periodType,
    year,
    month,
    week,
    searchParams,
    setSearchParams,
  ])

  const patch = useCallback(
    (changes: ParamPatch) => {
      const next = new URLSearchParams(searchParams)
      for (const [key, value] of Object.entries(changes)) {
        if (value === null || value === undefined || value === '') {
          next.delete(key)
        } else {
          next.set(key, String(value))
        }
      }
      setSearchParams(next, { replace: true })
    },
    [searchParams, setSearchParams]
  )

  /**
   * Write the whole optional-filter set at once (filter dialog "Xác nhận"). Absent
   * fields are cleared, so the dialog is the single source of truth for these params.
   */
  const applyFilters = useCallback(
    (values: TkkdReportFilterSelection) => {
      patch({
        contract_date_from: values.contractDateFrom
          ? formatDateToApi(values.contractDateFrom)
          : null,
        contract_date_to: values.contractDateTo ? formatDateToApi(values.contractDateTo) : null,
        transaction_sheet_date_from: values.transactionSheetDateFrom
          ? formatDateToApi(values.transactionSheetDateFrom)
          : null,
        transaction_sheet_date_to: values.transactionSheetDateTo
          ? formatDateToApi(values.transactionSheetDateTo)
          : null,
        branch: values.branch ? values.branch : null,
        block: values.block ? values.block : null,
        department: values.department ? values.department : null,
      })
    },
    [patch]
  )

  /** Values to hydrate the filter dialog with — mirrors what is currently in the URL. */
  const filterFormValues = useMemo<TkkdReportFilterSelection>(
    () => ({
      contractDateFrom: parseDateFromApi(contractDateFrom),
      contractDateTo: parseDateFromApi(contractDateTo),
      transactionSheetDateFrom: parseDateFromApi(transactionSheetDateFrom),
      transactionSheetDateTo: parseDateFromApi(transactionSheetDateTo),
      branch: branch ? String(branch) : undefined,
      block: block ? String(block) : undefined,
      department: department ? String(department) : undefined,
    }),
    [
      contractDateFrom,
      contractDateTo,
      transactionSheetDateFrom,
      transactionSheetDateTo,
      branch,
      block,
      department,
    ]
  )

  /**
   * Badge on the filter button: the contract sign-date range counts as one, the
   * transaction-sheet date range as its own separate one (independent, AND-able filter),
   * each org level as one.
   */
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (contractDateFrom || contractDateTo) count++
    if (transactionSheetDateFrom || transactionSheetDateTo) count++
    if (branch) count++
    if (block) count++
    if (department) count++
    return count
  }, [
    contractDateFrom,
    contractDateTo,
    transactionSheetDateFrom,
    transactionSheetDateTo,
    branch,
    block,
    department,
  ])

  const params = useMemo(
    () =>
      buildTkkdReportParams({
        periodType,
        year,
        month,
        week,
        contractDateFrom,
        contractDateTo,
        transactionSheetDateFrom,
        transactionSheetDateTo,
        branch,
        block,
        department,
      }),
    [
      periodType,
      year,
      month,
      week,
      contractDateFrom,
      contractDateTo,
      transactionSheetDateFrom,
      transactionSheetDateTo,
      branch,
      block,
      department,
    ]
  )

  return {
    periodType,
    year,
    month,
    week,
    contractDateFrom,
    contractDateTo,
    transactionSheetDateFrom,
    transactionSheetDateTo,
    branch,
    block,
    department,
    periods,
    activePeriodId,
    isUrlReady,
    params,
    searchParams,
    patch,
    applyFilters,
    filterFormValues,
    activeFilterCount,
  }
}

export type TkkdReportFiltersController = ReturnType<typeof useTkkdReportFilters>
