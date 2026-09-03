import { useCallback, useMemo, useRef, useState } from 'react'
import { useDialog } from '@/hooks/useDialog.ts'
import RecruitmentDashboardFilterForm, {
  type RecruitmentDashboardFilterFormRef,
  type RecruitmentDashboardFilterFormValues,
} from '../components/recruitment/RecruitmentDashboardFilterForm.tsx'
import FilterFooter from '@/components/commons/FilterFooter'
import { cleanObject } from '@/utils/common.ts'
import { startOfYear } from 'date-fns'
import { formatDateRangeText, formatDateToApi } from '@/utils/date-utils.ts'

function getDefaultDateRange() {
  const today = new Date()
  return { from: startOfYear(today), to: today }
}

export const useCostBreakdownBySourceFilter = () => {
  const refForm = useRef<RecruitmentDashboardFilterFormRef>(null)
  const defaultDateRange = useMemo(() => getDefaultDateRange(), [])

  const [chartFilter, setChartFilter] = useState<RecruitmentDashboardFilterFormValues | null>(null)

  const filterParams = useMemo(() => {
    if (chartFilter?.dateRange?.from && chartFilter?.dateRange?.to) {
      return chartFilter
    }
    return { dateRange: defaultDateRange }
  }, [chartFilter, defaultDateRange])

  const subTitle = useMemo(
    () =>
      filterParams?.dateRange
        ? formatDateRangeText(filterParams.dateRange.from, filterParams.dateRange.to)
        : '',
    [filterParams]
  )

  const filterCount = useMemo(() => {
    if (filterParams?.dateRange?.from && filterParams?.dateRange?.to) {
      return 1
    }
    return 0
  }, [filterParams?.dateRange?.from, filterParams?.dateRange?.to])

  const apiParams = useMemo(() => {
    if (!filterParams?.dateRange?.from || !filterParams?.dateRange?.to) {
      return {}
    }
    return {
      from_date: formatDateToApi(filterParams.dateRange.from),
      to_date: formatDateToApi(filterParams.dateRange.to),
    }
  }, [filterParams?.dateRange?.from, filterParams?.dateRange?.to])

  const { displayFormContent, displayClose } = useDialog()

  const onClickClearFilter = useCallback(() => {
    refForm.current?.clearForm()
    setChartFilter(null)
    displayClose()
  }, [displayClose])

  const onClickApply = useCallback(() => {
    const formData = refForm.current?.getValues?.()
    if (formData) {
      const filteredParams = cleanObject(formData)
      if (filteredParams.dateRange?.from && filteredParams.dateRange?.to) {
        setChartFilter(filteredParams)
      } else {
        setChartFilter(null)
      }
      displayClose()
    }
  }, [displayClose])

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
            hideBranch
          />
        </>
      ),
      footer: (
        <FilterFooter onClear={onClickClearFilter} onApply={onClickApply} onCancel={displayClose} />
      ),
    })
  }, [displayFormContent, filterParams, onClickClearFilter, onClickApply, displayClose])

  return {
    openFilterModal,
    filterParams,
    subTitle,
    filterCount,
    apiParams,
  }
}
