import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { DateRange } from 'react-day-picker'
import {
  useAllAccountingPeriods,
  useCurrentAccountingPeriod,
} from '@/features/accounting/accounting-periods/services/accounting-period-service'
import { parsePositiveInt } from '@/utils/common'
import { formatDateToApi, parseDateFromApi } from '@/utils/date-utils'
import { buildDepositCumulativeParams } from './deposit-cumulative-params'

export { buildDepositCumulativeParams }

/** Patch value: `null` removes the URL param, otherwise it is set. */
type ParamPatch = Record<string, string | number | null | undefined>

/** Optional filters as the filter dialog hands them back. */
export type DepositCumulativeFilterSelection = {
  branch?: string
  block?: string
  department?: string
  /** Ngày làm phiếu TTGD — bộ lọc ĐỘC LẬP, cộng thêm (AND). */
  transactionSheetDateRange?: DateRange | null
}

/**
 * URL-backed filter state for the deposit-cumulative reports. Month-only: the endpoint
 * requires `year`+`month` (they define the Mon-Sun week columns), so there is no week
 * mode. Seeds the current accounting period on first load so the report queries right
 * away. Extra filters: org-chart `branch`/`block`/`department`.
 */
export function useDepositCumulativeFilters() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [isUrlReady, setIsUrlReady] = useState(false)

  const { data: currentPeriod, isLoading: isLoadingCurrent } = useCurrentAccountingPeriod()
  const { data: allPeriods } = useAllAccountingPeriods()
  const periods = useMemo(() => allPeriods ?? [], [allPeriods])

  const year = parsePositiveInt(searchParams.get('year'))
  const month = parsePositiveInt(searchParams.get('month'))
  const branch = parsePositiveInt(searchParams.get('branch')) || undefined
  const block = parsePositiveInt(searchParams.get('block')) || undefined
  const department = parsePositiveInt(searchParams.get('department')) || undefined
  const transactionSheetDateFrom = searchParams.get('transaction_sheet_date_from') || undefined
  const transactionSheetDateTo = searchParams.get('transaction_sheet_date_to') || undefined

  const activePeriodId = useMemo(() => {
    if (year && month) {
      return periods.find((p) => p.year === year && p.month === month)?.id || null
    }
    return null
  }, [periods, year, month])

  // Seed the current accounting period so the report queries immediately instead of
  // sitting empty until the user picks a period.
  useEffect(() => {
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
  }, [periods, currentPeriod, isLoadingCurrent, year, month, searchParams, setSearchParams])

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
    (values: DepositCumulativeFilterSelection) => {
      patch({
        branch: values.branch ? values.branch : null,
        block: values.block ? values.block : null,
        department: values.department ? values.department : null,
        transaction_sheet_date_from: values.transactionSheetDateRange?.from
          ? formatDateToApi(values.transactionSheetDateRange.from)
          : null,
        transaction_sheet_date_to: values.transactionSheetDateRange?.to
          ? formatDateToApi(values.transactionSheetDateRange.to)
          : null,
      })
    },
    [patch]
  )

  /** Values to hydrate the filter dialog with — mirrors what is currently in the URL. */
  const filterFormValues = useMemo<DepositCumulativeFilterSelection>(
    () => ({
      branch: branch ? String(branch) : undefined,
      block: block ? String(block) : undefined,
      department: department ? String(department) : undefined,
      transactionSheetDateRange:
        transactionSheetDateFrom || transactionSheetDateTo
          ? {
              from: parseDateFromApi(transactionSheetDateFrom),
              to: parseDateFromApi(transactionSheetDateTo),
            }
          : null,
    }),
    [branch, block, department, transactionSheetDateFrom, transactionSheetDateTo]
  )

  /**
   * Badge on the filter button: one per active org level, plus one for the
   * transaction-sheet date range — independent of, and AND-able with, everything else.
   */
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (branch) count++
    if (block) count++
    if (department) count++
    if (transactionSheetDateFrom || transactionSheetDateTo) count++
    return count
  }, [branch, block, department, transactionSheetDateFrom, transactionSheetDateTo])

  const params = useMemo(
    () =>
      buildDepositCumulativeParams({
        year,
        month,
        branch,
        block,
        department,
        transactionSheetDateFrom,
        transactionSheetDateTo,
      }),
    [year, month, branch, block, department, transactionSheetDateFrom, transactionSheetDateTo]
  )

  return {
    year,
    month,
    branch,
    block,
    department,
    transactionSheetDateFrom,
    transactionSheetDateTo,
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

export type DepositCumulativeFiltersController = ReturnType<typeof useDepositCumulativeFilters>
