import { useCallback, useMemo, useRef, useState } from 'react'
import { useDialog } from '@/hooks/useDialog.ts'
import SalesRevenueFilterForm, {
  type SalesRevenueFilterFormRef,
  type SalesRevenueFilterFormValues,
} from '@/features/report/staff/sales-revenue/SalesRevenueFilterForm.tsx'
import FilterFooter from '@/components/commons/FilterFooter'
import { cleanObject } from '@/utils/common.ts'
import { startOfMonth, subMonths } from 'date-fns'
import { formatDateRangeText, formatDateToMonth } from '@/utils/date-utils.ts'

export const useSalesRevenueDashboardFilter = () => {
  const refForm = useRef<SalesRevenueFilterFormRef>(null)
  const today = new Date()
  const defaultDateRange = { from: startOfMonth(subMonths(today, 6)), to: today }

  const [chartFilter, setChartFilter] = useState<SalesRevenueFilterFormValues | null>(null)
  const [chartFilterVersion, setChartFilterVersion] = useState(0)
  const [isExplicitlyCleared, setIsExplicitlyCleared] = useState(false)

  const filterParams = useMemo(() => {
    if (chartFilter && (chartFilter.dateRange?.from || chartFilter.dateRange?.to)) {
      return chartFilter
    }
    if (isExplicitlyCleared) {
      return {}
    }
    return { dateRange: defaultDateRange }
  }, [chartFilter, defaultDateRange, isExplicitlyCleared])

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
      count++
    }
    if (filterParams?.branch) count++
    if (filterParams?.block) count++
    if (filterParams?.department) count++
    return count
  }, [
    filterParams?.dateRange?.from,
    filterParams?.dateRange?.to,
    filterParams?.branch,
    filterParams?.block,
    filterParams?.department,
  ])

  const apiParams = useMemo(() => {
    const params: any = {}

    if (filterParams.dateRange?.from) {
      params.from_month = formatDateToMonth(filterParams.dateRange.from)
    }
    if (filterParams.dateRange?.to) {
      params.to_month = formatDateToMonth(filterParams.dateRange.to)
    }
    if (filterParams.branch) {
      params.branch = filterParams.branch
    }
    if (filterParams.block) {
      params.block = filterParams.block
    }
    if (filterParams.department) {
      params.department = filterParams.department
    }

    return params
  }, [
    filterParams.dateRange?.from,
    filterParams.dateRange?.to,
    filterParams.branch,
    filterParams.block,
    filterParams.department,
    chartFilterVersion,
  ])

  const { displayFormContent, displayClose } = useDialog()

  const onClickClearFilter = useCallback(() => {
    refForm.current?.clearForm()
    const newVersion = chartFilterVersion + 1
    setChartFilter(null)
    setIsExplicitlyCleared(true)
    setChartFilterVersion(newVersion)
    displayClose()
  }, [displayClose, chartFilterVersion])

  const onClickApply = useCallback(async () => {
    const formData = refForm.current?.getValues?.()
    if (formData) {
      const filteredParams = cleanObject(formData)
      const newVersion = chartFilterVersion + 1
      if (
        !filteredParams.dateRange?.from &&
        !filteredParams.dateRange?.to &&
        !filteredParams.branch &&
        !filteredParams.block &&
        !filteredParams.department
      ) {
        setChartFilter(null)
        setIsExplicitlyCleared(true)
        setChartFilterVersion(newVersion)
      } else {
        setChartFilter(filteredParams)
        setIsExplicitlyCleared(false)
        setChartFilterVersion(newVersion)
      }
      displayClose()
    }
  }, [displayClose, chartFilterVersion])

  const openFilterModal = useCallback(() => {
    displayFormContent({
      title: 'Bộ lọc',
      content: (
        <>
          <SalesRevenueFilterForm ref={refForm} initialValues={filterParams} />
        </>
      ),
      footer: (
        <FilterFooter onClear={onClickClearFilter} onApply={onClickApply} onCancel={displayClose} />
      ),
    })
  }, [displayFormContent, onClickApply, filterParams, onClickClearFilter, displayClose])

  return {
    openFilterModal,
    filterParams,
    setFilterParams: setChartFilter,
    subTitle,
    filterCount,
    apiParams,
  }
}
