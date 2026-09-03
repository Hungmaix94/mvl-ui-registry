import { useCallback, useRef, useState, useMemo } from 'react'
import { useDialog } from '@/hooks/useDialog.ts'
import { Button } from '@/components/ui'
import { cn } from '@/utils'
import { useInvalidateQueries } from '@/hooks/useApiQuery.ts'
import DecisionFilterForm, {
  type DecisionFilterFormRef,
} from '../components/DecisionFilterForm.tsx'
import { DecisionFilterFormValues } from '../types.ts'
import { formatDateToApi } from '@/utils/date-utils.ts'
import { DateRange } from 'react-day-picker'

export const useDecisionFilter = (onApplyFilter?: (filters: Record<string, any>) => void) => {
  const refForm = useRef<DecisionFilterFormRef>(null)
  const [filterParams, setFilterParams] = useState<Record<string, any>>({})
  const { displayFormContent, displayClose } = useDialog()
  const invalidateQueries = useInvalidateQueries()

  // Convert API params back to form values (DateRange) for initial values
  const initialFormValues = useMemo(() => {
    const formValues: DecisionFilterFormValues = {}

    // Convert effective_date_from and effective_date_to back to DateRange
    if (filterParams.effective_date_from || filterParams.effective_date_to) {
      const fromDate = filterParams.effective_date_from
        ? new Date(filterParams.effective_date_from)
        : undefined
      const toDate = filterParams.effective_date_to
        ? new Date(filterParams.effective_date_to)
        : undefined

      if (fromDate || toDate) {
        formValues.effective_date_range = {
          from: fromDate,
          to: toDate,
        } as DateRange
      }
    }

    return formValues
  }, [filterParams])

  const onClickClearFilter = useCallback(() => {
    refForm.current?.clearForm()
    setFilterParams({})
    onApplyFilter?.({})
  }, [onApplyFilter])

  const onClickApply = useCallback(async () => {
    const formData = refForm.current?.getValues?.()
    if (formData) {
      try {
        // Filter out empty values and convert DateRange to API params
        const apiParams: Record<string, any> = {}

        // Convert DateRange to effective_date_from and effective_date_to
        if (formData.effective_date_range) {
          const { from, to } = formData.effective_date_range
          if (from) {
            apiParams.effective_date_from = formatDateToApi(from)
          }
          if (to) {
            apiParams.effective_date_to = formatDateToApi(to)
          }
        }

        // Apply filter to parent component
        onApplyFilter?.(apiParams)

        // Update filter params
        setFilterParams(apiParams)

        // Close dialog first
        displayClose()

        // Then invalidate queries to refresh the data with new filter
        await invalidateQueries.invalidateByPrefix('hrm/decisions')
      } catch (error) {
        console.error('Error applying filter:', error)
        displayClose()
      }
    }
  }, [onApplyFilter, displayClose, invalidateQueries])

  const leftFooterContent = (
    <Button
      variant={'text'}
      size={'small'}
      onClick={onClickClearFilter}
      className={cn('text-action-primary-red-default hover:text-action-primary-red-hover p-0')}
    >
      Xoá bộ lọc
    </Button>
  )

  const openFilterModal = useCallback(() => {
    displayFormContent({
      title: 'Bộ lọc',
      content: (
        <>
          <DecisionFilterForm ref={refForm} initialValues={initialFormValues} />
        </>
      ),
      leftFooterContent,
      confirmText: 'Áp dụng',
      onConfirm: onClickApply,
      confirmButtonClassName:
        'bg-action-primary-red-default hover:bg-action-primary-red-hover text-white min-w-[128px]',
    })
  }, [displayFormContent, onClickApply, initialFormValues, leftFooterContent])

  const clearFilter = useCallback(() => {
    onClickClearFilter()
    invalidateQueries.invalidateByPrefix('hrm/decisions')
    onApplyFilter?.({})
  }, [onClickClearFilter, invalidateQueries, onApplyFilter])

  return {
    openFilterModal,
    filterParams,
    clearFilter,
  }
}
